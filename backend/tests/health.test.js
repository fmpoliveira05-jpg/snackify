/**
 * Verificações de saúde (monitorização de disponibilidade).
 */
const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../app');

const app = createApp();

afterEach(() => jest.restoreAllMocks());

const withConnection = (readyState, ping) => {
  jest.spyOn(mongoose, 'connection', 'get').mockReturnValue({
    readyState,
    db: { admin: () => ({ ping }) },
  });
};

test('GET /health/live responde 200 sem tocar na base de dados', async () => {
  const res = await request(app).get('/health/live');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
  expect(res.headers['cache-control']).toBe('no-store');
});

test('GET /health/ready responde 200 quando o MongoDB responde ao ping', async () => {
  withConnection(1, jest.fn().mockResolvedValue({ ok: 1 }));
  const res = await request(app).get('/health/ready');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok', checks: { mongo: 'ok' } });
});

test('GET /health/ready responde 503 sem ligação ao MongoDB e não revela pormenores', async () => {
  withConnection(0, jest.fn());
  const res = await request(app).get('/health/ready');
  expect(res.status).toBe(503);
  expect(JSON.stringify(res.body)).not.toMatch(/mongodb:\/\/|Error|stack/i);
});

test('GET /health/ready responde 503 quando o ping falha', async () => {
  withConnection(1, jest.fn().mockRejectedValue(new Error('ECONNREFUSED 10.0.0.1')));
  const res = await request(app).get('/health/ready');
  expect(res.status).toBe(503);
  expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|10\.0\.0\.1/);
});

test('as verificações de saúde não contam para o limite de pedidos', async () => {
  const saved = process.env.RATE_LIMIT_ENABLED;
  process.env.RATE_LIMIT_ENABLED = 'true';
  let isolated;
  try {
    jest.isolateModules(() => { isolated = require('../app')(); });
  } finally {
    if (saved === undefined) delete process.env.RATE_LIMIT_ENABLED; else process.env.RATE_LIMIT_ENABLED = saved;
  }
  const api = await request(isolated).get('/auth/me');
  expect(api.headers).toHaveProperty('ratelimit-policy');
  const health = await request(isolated).get('/health/live');
  expect(health.status).toBe(200);
  expect(health.headers).not.toHaveProperty('ratelimit-policy');
});
