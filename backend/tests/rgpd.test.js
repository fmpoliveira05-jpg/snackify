/**
 * RGPD: aceitação da Política de Privacidade, exportação e apagamento da conta e serialização
 * sem campos sensíveis (versão com mocks; o fluxo completo está em tests-integracao/).
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const createApp = require('../app');
const { config } = require('../config/env');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const accountData = require('../services/accountData');
const { HIDDEN_FIELDS } = require('../models/accountSecurity');
const { asUser, fromClient, mockQuery } = require('./support/helpers');

const app = createApp();

afterEach(() => jest.restoreAllMocks());

const validCustomer = {
  name: 'Ana Silva',
  username: 'anasilva',
  email: 'ana@exemplo.pt',
  password: 'Passw0rd!Forte',
  birthDate: '1990-01-01',
  phone: '912345678',
  'address[street]': 'Rua Direita',
  'address[number]': '10',
  'address[zipCode]': '4000-123',
  'address[place]': 'Porto',
  'address[district]': 'Porto',
  'address[country]': 'Portugal',
};

describe('registo', () => {
  test('sem aceitar a Política de Privacidade a conta não é criada', async () => {
    const save = jest.spyOn(User.prototype, 'save');
    const res = await fromClient(request(app).post('/register/registar-cliente'))
      .set('Accept', 'application/json')
      .type('form')
      .send(validCustomer);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Política de Privacidade/);
    expect(save).not.toHaveBeenCalled();
  });

  test('ao aceitar, guarda a versão da política e a data da aceitação', async () => {
    jest.spyOn(User, 'exists').mockResolvedValue(null);
    jest.spyOn(Restaurant, 'exists').mockResolvedValue(null);
    jest.spyOn(User, 'updateOne').mockResolvedValue({});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    let saved;
    jest.spyOn(User.prototype, 'save').mockImplementation(function save() { saved = this; return Promise.resolve(this); });

    const res = await fromClient(request(app).post('/register/registar-cliente'))
      .set('Accept', 'application/json')
      .type('form')
      .send({ ...validCustomer, acceptPrivacy: 'on' });

    expect(res.status).toBe(201);
    expect(saved.privacyPolicyVersion).toBe(config.privacyPolicyVersion);
    expect(saved.privacyAcceptedAt).toBeInstanceOf(Date);
  });

  test('a caixa da política nunca vem marcada nos formulários EJS', async () => {
    for (const url of ['/register/registar-cliente', '/register/registar-restaurante']) {
      const res = await request(app).get(url).set('Accept', 'text/html');
      expect(res.text).toMatch(/name="acceptPrivacy"/);
      expect(res.text).not.toMatch(/name="acceptPrivacy"[^>]*checked/);
      expect(res.text).toMatch(/\/privacidade/);
    }
  });
});

describe('exportação dos dados', () => {
  test('devolve um ficheiro JSON para descarregar, sem cache', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    jest.spyOn(accountData, 'exportAccountData').mockResolvedValue({ conta: { name: 'Ana Silva' } });
    const res = await asUser(request(app).get('/user/perfil/exportar'), 'c1', 'customer');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="snackify-dados-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(JSON.parse(res.text)).toEqual({ conta: { name: 'Ana Silva' } });
  });

  test('sem sessão responde 401', async () => {
    const res = await request(app).get('/user/perfil/exportar');
    expect(res.status).toBe(401);
  });
});

describe('apagar a conta', () => {
  const hash = bcrypt.hashSync('Passw0rd!Forte', 4);

  test('com a password errada não apaga nada', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer', password: hash });
    const remove = jest.spyOn(accountData, 'deleteAccountData');
    const res = await asUser(request(app).post('/user/perfil/eliminar'), 'c1', 'customer').send({ password: 'errada' });
    expect(res.status).toBe(401);
    expect(remove).not.toHaveBeenCalled();
  });

  test('com a password certa apaga e termina a sessão', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer', password: hash });
    jest.spyOn(accountData, 'deleteAccountData').mockResolvedValue({ ok: true, summary: {} });
    const res = await asUser(request(app).post('/user/perfil/eliminar'), 'c1', 'customer').send({ password: 'Passw0rd!Forte' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(new RegExp(`${config.sessionCookieName}=;`));
  });

  test('uma conta de administrador não é apagada por aqui', async () => {
    const result = await accountData.deleteAccountData({ _id: 'a1', userType: 'admin' });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});

describe('serialização sem campos sensíveis', () => {
  const secrets = {
    password: '$2b$12$hash',
    emailVerificationTokenHash: 'a'.repeat(64),
    emailVerificationExpires: new Date(),
    passwordResetTokenHash: 'b'.repeat(64),
    passwordResetExpires: new Date(),
    failedLoginAttempts: 3,
    lockUntil: new Date(),
    tokenVersion: 7,
  };

  test.each([
    ['User', () => new User({ name: 'Ana Silva', username: 'ana', email: 'ana@exemplo.pt', ...secrets })],
    ['Restaurant', () => new Restaurant({ name: 'Tasca', username: 'tasca', email: 't@exemplo.pt', activeOrderIds: [], ...secrets })],
  ])('%s: toJSON, toObject e JSON.stringify nunca incluem password, hashes de tokens nem bloqueios', (name, build) => {
    const doc = build();
    for (const serialized of [doc.toJSON(), doc.toObject(), JSON.parse(JSON.stringify(doc))]) {
      HIDDEN_FIELDS.forEach((field) => expect(serialized).not.toHaveProperty(field));
      expect(serialized.email).toBeDefined();
    }
  });

  test('a lista de campos escondidos cobre todos os campos sensíveis do esquema', () => {
    ['password', 'emailVerificationTokenHash', 'passwordResetTokenHash', 'failedLoginAttempts', 'lockUntil', 'tokenVersion', 'activeOrderIds']
      .forEach((field) => expect(HIDDEN_FIELDS).toContain(field));
  });

  test('GET /auth/me não devolve campos sensíveis mesmo que tenham sido lidos', async () => {
    const doc = new User({ _id: '507f1f77bcf86cd799439011', name: 'Ana Silva', username: 'ana', email: 'ana@exemplo.pt', userType: 'customer', ...secrets });
    mockQuery(User, 'findById', doc);
    const res = await asUser(request(app).get('/auth/me'), '507f1f77bcf86cd799439011', 'customer', 7);
    expect(res.status).toBe(200);
    HIDDEN_FIELDS.forEach((field) => expect(res.body).not.toHaveProperty(field));
    expect(JSON.stringify(res.body)).not.toMatch(/\$2b\$|aaaaaaaa|bbbbbbbb/);
  });
});
