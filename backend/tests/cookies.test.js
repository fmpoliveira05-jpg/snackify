/**
 * Atributos do cookie da sessão ao nível do cabeçalho Set-Cookie, em modo de produção
 * (HTTPS atrás de um proxy): __Host-, Secure, HttpOnly, SameSite=Strict, Path=/ e sem Domain.
 * O comportamento no browser (sem tokens no localStorage/sessionStorage) é testado em
 * tests-navegador/armazenamento.e2e.js.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');

const PASSWORD = 'Passw0rd!Forte';

/** Aplicação em modo de produção, com os modelos desse registo de módulos. */
function productionApp() {
  const saved = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: 'production',
    JWT_SECRET: 'x'.repeat(40),
    TRUST_PROXY: '1',
    SERVER_URL: 'https://snackify.exemplo.pt',
    CLIENT_URL: 'https://snackify.exemplo.pt',
  });
  let loaded;
  try {
    jest.isolateModules(() => {
      loaded = {
        app: require('../app')(),
        User: require('../models/user'),
        Restaurant: require('../models/restaurant'),
        config: require('../config/env').config,
      };
    });
  } finally {
    process.env = saved;
  }
  return loaded;
}

afterEach(() => jest.restoreAllMocks());

test('o login em produção cria o cookie __Host- com Secure, HttpOnly, SameSite=Strict, Path=/ e sem Domain', async () => {
  const { app, User, Restaurant } = productionApp();
  const account = {
    _id: '507f1f77bcf86cd799439011', username: 'ana', userType: 'customer', emailVerified: true, tokenVersion: 0,
    password: bcrypt.hashSync(PASSWORD, 4),
  };
  jest.spyOn(User, 'findOne').mockReturnValue({ select: jest.fn().mockResolvedValue(account) });
  jest.spyOn(Restaurant, 'findOne').mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

  const res = await request(app)
    .post('/auth/login')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://snackify.exemplo.pt')
    .send({ username: 'ana', password: PASSWORD });

  expect(res.status).toBe(200);
  const cookie = res.headers['set-cookie'].find((c) => c.startsWith('__Host-snackify='));
  expect(cookie).toBeDefined();
  expect(cookie).toMatch(/;\s*Secure/i);
  expect(cookie).toMatch(/;\s*HttpOnly/i);
  expect(cookie).toMatch(/;\s*SameSite=Strict/i);
  expect(cookie).toMatch(/;\s*Path=\//i);
  expect(cookie).not.toMatch(/Domain=/i);
  // O token nunca vai no corpo da resposta (só no cookie).
  expect(JSON.stringify(res.body)).not.toMatch(/eyJ/);
  // Nenhum outro cookie é criado.
  expect(res.headers['set-cookie']).toHaveLength(1);
});

test('o logout em produção apaga o cookie com os mesmos atributos', async () => {
  const { app } = productionApp();
  const res = await request(app)
    .post('/auth/logout')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://snackify.exemplo.pt');
  expect(res.status).toBe(200);
  const cookie = res.headers['set-cookie'][0];
  expect(cookie).toMatch(/^__Host-snackify=;/);
  expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
  expect(cookie).toMatch(/;\s*Secure/i);
  expect(cookie).toMatch(/;\s*HttpOnly/i);
});

test('em produção, um pedido em HTTP é redirecionado para HTTPS antes de qualquer cookie', async () => {
  const { app } = productionApp();
  const res = await request(app).post('/auth/login').send({ username: 'ana', password: PASSWORD });
  expect(res.status).toBe(308);
  expect(res.headers.location).toBe('https://snackify.exemplo.pt/auth/login');
  expect(res.headers['set-cookie']).toBeUndefined();
});
