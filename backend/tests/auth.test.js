/**
 * Sessão, verificação do email, bloqueio por tentativas falhadas e recuperação da password.
 * A base de dados é simulada com mocks (sem MongoDB).
 */
const crypto = require('crypto');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createApp = require('../app');
const { config } = require('../config/env');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const mailer = require('../utils/mailer');
const { signSessionToken } = require('../services/session');
const { asUser, fromClient, mockQuery, sessionCookie } = require('./support/helpers');

const app = createApp();

const PASSWORD = 'Password#Forte1';
// Custo baixo só nos testes, para não os tornar lentos (a aplicação usa 12).
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/** Conta de cliente simulada, com os campos de segurança. */
const customerAccount = (overrides = {}) => ({
  _id: 'c1',
  name: 'Ana Silva',
  email: 'ana@example.com',
  username: 'ana',
  userType: 'customer',
  password: PASSWORD_HASH,
  emailVerified: true,
  failedLoginAttempts: 0,
  lockUntil: undefined,
  tokenVersion: 0,
  ...overrides,
});

/** Faz o login encontrar esta conta entre os clientes (e nenhum restaurante). */
const loginFinds = (account) => {
  mockQuery(User, 'findOne', account);
  mockQuery(Restaurant, 'findOne', null);
};

const login = (username = 'ana', password = PASSWORD) =>
  fromClient(request(app).post('/auth/login')).send({ username, password });

let sentMail;
beforeEach(() => {
  sentMail = [];
  mailer.setTransporter({ sendMail: jest.fn(async (message) => { sentMail.push(message); }) });
});
afterEach(() => {
  jest.restoreAllMocks();
  mailer.setTransporter(null);
});

describe('sessão por cookie', () => {
  test('o login cria o cookie httpOnly e não devolve o token no corpo', async () => {
    loginFinds(customerAccount());
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Login bem-sucedido!', userType: 'customer' });
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/);

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith(`${config.sessionCookieName}=`));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//);
  });

  test('o JWT usa HS256, emissor, público, jti e a versão da conta', async () => {
    loginFinds(customerAccount({ tokenVersion: 3 }));
    const res = await login();
    const token = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const { header, payload } = jwt.decode(token, { complete: true });

    expect(header.alg).toBe('HS256');
    expect(payload).toMatchObject({ iss: config.jwtIssuer, aud: config.jwtAudience, tv: 3, userType: 'customer' });
    expect(payload.jti).toEqual(expect.any(String));
  });

  test('o cookie da sessão dá acesso ao /auth/me', async () => {
    mockQuery(User, 'findById', customerAccount());
    const res = await asUser(request(app).get('/auth/me'), 'c1', 'customer');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('ana');
  });

  test('o cabeçalho Authorization: Bearer deixou de ser aceite', async () => {
    mockQuery(User, 'findById', customerAccount());
    const token = signSessionToken({ _id: 'c1' }, 'customer');
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test.each([
    ['assinado com outro algoritmo (HS512)', { algorithm: 'HS512', issuer: config.jwtIssuer, audience: config.jwtAudience }],
    ['sem emissor', { audience: config.jwtAudience }],
    ['emitido para outro público', { issuer: config.jwtIssuer, audience: 'outra-app' }],
  ])('um token %s é rejeitado', async (_, options) => {
    mockQuery(User, 'findById', customerAccount());
    const token = jwt.sign({ userId: 'c1', userType: 'customer', tv: 0 }, config.jwtSecret, options);
    const res = await request(app).get('/auth/me').set('Cookie', `${config.sessionCookieName}=${token}`);
    expect(res.status).toBe(401);
  });

  test('um token com uma versão antiga (sessão revogada) é rejeitado', async () => {
    mockQuery(User, 'findById', customerAccount({ tokenVersion: 1 }));
    const res = await asUser(request(app).get('/auth/me'), 'c1', 'customer', 0);
    expect(res.status).toBe(401);
  });

  test('os campos sensíveis nunca aparecem no /auth/me', async () => {
    const doc = new User({ ...customerAccount({ _id: undefined }), passwordResetTokenHash: 'x', tokenVersion: 0 });
    mockQuery(User, 'findById', doc);
    const res = await asUser(request(app).get('/auth/me'), String(doc._id), 'customer');
    expect(res.status).toBe(200);
    ['password', 'passwordResetTokenHash', 'tokenVersion', 'failedLoginAttempts'].forEach((field) => {
      expect(res.body).not.toHaveProperty(field);
    });
  });

  test('o logout apaga o cookie', async () => {
    const res = await fromClient(request(app).post('/auth/logout'));
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(new RegExp(`^${config.sessionCookieName}=;`));
  });

  test('terminar todas as sessões incrementa a versão do token', async () => {
    mockQuery(User, 'findById', customerAccount());
    const update = jest.spyOn(User, 'updateOne').mockResolvedValue({});
    const res = await asUser(request(app).post('/auth/logout-all'), 'c1', 'customer');
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ _id: 'c1' }, { $inc: { tokenVersion: 1 } });
  });
});

describe('verificação do email', () => {
  test('o login é recusado enquanto o email não estiver confirmado', async () => {
    loginFinds(customerAccount({ emailVerified: false }));
    const res = await login();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('um token mal formado é recusado sem consultar a base de dados', async () => {
    const find = jest.spyOn(User, 'findOneAndUpdate');
    const res = await fromClient(request(app).post('/auth/verify-email')).send({ token: 'abc' });
    expect(res.status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  test('confirma o email com o hash do token e apaga-o (uso único)', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    const update = jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue({ _id: 'c1' });

    const res = await fromClient(request(app).post('/auth/verify-email')).send({ token });

    expect(res.status).toBe(200);
    const [filter, changes] = update.mock.calls[0];
    expect(filter.emailVerificationTokenHash).toBe(sha256(token));
    expect(changes.$set.emailVerified).toBe(true);
    expect(changes.$unset).toHaveProperty('emailVerificationTokenHash');
  });

  test('também confirma contas de restaurante, e aceita GET', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(Restaurant, 'findOneAndUpdate').mockResolvedValue({ _id: 'r1' });
    const res = await request(app).get(`/auth/verify-email?token=${token}`);
    expect(res.status).toBe(200);
  });

  test('um token desconhecido ou expirado dá erro genérico', async () => {
    jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(Restaurant, 'findOneAndUpdate').mockResolvedValue(null);
    const res = await fromClient(request(app).post('/auth/verify-email')).send({ token: 'a'.repeat(64) });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('O link é inválido ou já expirou.');
  });

  test('o reenvio responde sempre o mesmo, exista ou não a conta', async () => {
    mockQuery(User, 'findOne', null);
    mockQuery(Restaurant, 'findOne', null);
    const unknown = await fromClient(request(app).post('/auth/resend-verification')).send({ email: 'x@example.com' });

    jest.restoreAllMocks();
    mailer.setTransporter({ sendMail: jest.fn(async (m) => { sentMail.push(m); }) });
    mockQuery(User, 'findOne', customerAccount({ emailVerified: false }));
    const update = jest.spyOn(User, 'updateOne').mockResolvedValue({});
    const known = await fromClient(request(app).post('/auth/resend-verification')).send({ email: 'ana@example.com' });

    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(update.mock.calls[0][1].$set.emailVerificationTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0].text).toMatch(/\/verificar-email\?token=[a-f0-9]{64}/);
  });
});

describe('bloqueio por tentativas falhadas', () => {
  test('à 5.ª password errada a conta fica bloqueada 15 minutos, com a mesma mensagem genérica', async () => {
    // Estado da conta partilhado entre os pedidos, como se fosse a base de dados.
    const account = customerAccount();
    mockQuery(User, 'findOne', () => ({ ...account }));
    mockQuery(Restaurant, 'findOne', null);
    jest.spyOn(User, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
      account.failedLoginAttempts += update.$inc.failedLoginAttempts;
      return { failedLoginAttempts: account.failedLoginAttempts };
    });
    jest.spyOn(User, 'updateOne').mockImplementation(async (filter, update) => {
      Object.assign(account, update.$set || {});
      return {};
    });

    for (let i = 0; i < 5; i += 1) {
      const res = await login('ana', 'Errada#12345');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Credenciais inválidas.');
    }
    expect(account.lockUntil.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);

    // Mesmo com a password certa, enquanto estiver bloqueada a resposta é igual.
    const blocked = await login();
    expect(blocked.status).toBe(401);
    expect(blocked.body.message).toBe('Credenciais inválidas.');
    expect(blocked.headers['set-cookie']).toBeUndefined();
  });

  test('um login bem-sucedido limpa as tentativas falhadas', async () => {
    loginFinds(customerAccount({ failedLoginAttempts: 3 }));
    const update = jest.spyOn(User, 'updateOne').mockResolvedValue({});
    const res = await login();
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ _id: 'c1' }, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } });
  });

  test('uma conta inexistente também passa pelo bcrypt (tempo de resposta semelhante)', async () => {
    loginFinds(null);
    const compare = jest.spyOn(bcrypt, 'compare');
    const res = await login('ninguem');
    expect(res.status).toBe(401);
    expect(compare).toHaveBeenCalledTimes(1);
  });
});

describe('recuperação da password', () => {
  test('o pedido responde sempre o mesmo e só envia email se a conta existir', async () => {
    mockQuery(User, 'findOne', null);
    mockQuery(Restaurant, 'findOne', null);
    const res = await fromClient(request(app).post('/auth/forgot-password')).send({ email: 'x@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Se existir uma conta/);
    expect(sentMail).toHaveLength(0);
  });

  test('fluxo completo: o link redefine a password e invalida a sessão antiga', async () => {
    const account = customerAccount();
    mockQuery(User, 'findOne', account);
    jest.spyOn(User, 'updateOne').mockImplementation(async (filter, update) => {
      Object.assign(account, update.$set);
      return {};
    });

    const oldSession = sessionCookie('c1', 'customer', account.tokenVersion);

    const forgot = await fromClient(request(app).post('/auth/forgot-password')).send({ email: 'ana@example.com' });
    expect(forgot.status).toBe(200);
    expect(sentMail).toHaveLength(1);
    const token = sentMail[0].text.match(/redefinir-password\?token=([a-f0-9]{64})/)[1];
    expect(account.passwordResetTokenHash).toBe(sha256(token));
    expect(account.passwordResetExpires.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);

    jest.spyOn(User, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
      if (filter.passwordResetTokenHash !== account.passwordResetTokenHash) return null;
      Object.assign(account, update.$set);
      account.tokenVersion += update.$inc.tokenVersion;
      Object.keys(update.$unset).forEach((key) => { account[key] = undefined; });
      return account;
    });
    jest.spyOn(Restaurant, 'findOneAndUpdate').mockResolvedValue(null);

    const reset = await fromClient(request(app).post('/auth/reset-password')).send({ token, password: 'NovaPassword#2026' });
    expect(reset.status).toBe(200);
    expect(await bcrypt.compare('NovaPassword#2026', account.password)).toBe(true);
    expect(account.tokenVersion).toBe(1);
    expect(account.passwordResetTokenHash).toBeUndefined();

    // O mesmo link não serve duas vezes.
    const again = await fromClient(request(app).post('/auth/reset-password')).send({ token, password: 'OutraPassword#2026' });
    expect(again.status).toBe(400);

    // A sessão aberta antes da redefinição deixou de valer.
    mockQuery(User, 'findById', account);
    const me = await request(app).get('/auth/me').set('Cookie', oldSession);
    expect(me.status).toBe(401);
  });

  test('uma password fraca é recusada', async () => {
    const res = await fromClient(request(app).post('/auth/reset-password'))
      .send({ token: 'a'.repeat(64), password: 'curta1!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/entre 10 e 64/);
  });
});

describe('proteção contra bots', () => {
  test('o login com o campo honeypot preenchido é descartado', async () => {
    const find = jest.spyOn(User, 'findOne');
    const res = await fromClient(request(app).post('/auth/login')).send({ username: 'ana', password: PASSWORD, website: 'spam' });
    expect(res.status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  test('a recuperação com honeypot responde como sempre, sem fazer nada', async () => {
    const find = jest.spyOn(User, 'findOne');
    const res = await fromClient(request(app).post('/auth/forgot-password')).send({ email: 'ana@example.com', website: 'x' });
    expect(res.status).toBe(200);
    expect(find).not.toHaveBeenCalled();
  });

  describe('com o Turnstile configurado', () => {
    const axios = require('axios');
    beforeEach(() => { config.turnstileSecretKey = 'segredo-turnstile'; });
    afterEach(() => { config.turnstileSecretKey = ''; });

    test('sem token do desafio o login é recusado', async () => {
      const res = await login();
      expect(res.status).toBe(400);
    });

    test('um token rejeitado pela Cloudflare é recusado', async () => {
      const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: { success: false } });
      const res = await fromClient(request(app).post('/auth/login'))
        .send({ username: 'ana', password: PASSWORD, 'cf-turnstile-response': 'tok' });
      expect(res.status).toBe(400);
      expect(post.mock.calls[0][0]).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
      expect(post.mock.calls[0][2].timeout).toBe(5000);
    });

    test('um token válido deixa continuar', async () => {
      jest.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } });
      loginFinds(customerAccount());
      const res = await fromClient(request(app).post('/auth/login'))
        .send({ username: 'ana', password: PASSWORD, turnstileToken: 'tok' });
      expect(res.status).toBe(200);
    });
  });
});
