/**
 * Quotas por conta, tetos de chamadas a serviços externos e registos sem dados pessoais.
 */
const express = require('express');
const axios = require('axios');
const request = require('supertest');
const createApp = require('../app');
const { config } = require('../config/env');
const WindowBudget = require('../utils/budget');
const { createAccountLimiter } = require('../middlewares/rateLimiters');
const fetchOpenFoodData = require('../utils/openFoodFactsAPI');
const mailer = require('../utils/mailer');
const { logError } = require('../utils/logger');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const { mockQuery } = require('./support/helpers');

afterEach(() => jest.restoreAllMocks());

describe('WindowBudget', () => {
  test('esgota-se na janela e recomeça na seguinte', () => {
    let now = 0;
    const budget = new WindowBudget({ limit: 2, windowMs: 1000, now: () => now });
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);
    now = 1000;
    expect(budget.tryConsume()).toBe(true);
  });

  test('conta cada chave em separado', () => {
    const budget = new WindowBudget({ limit: 1, windowMs: 1000 });
    expect(budget.tryConsume('a')).toBe(true);
    expect(budget.tryConsume('b')).toBe(true);
    expect(budget.tryConsume('a')).toBe(false);
  });
});

describe('quotas por conta', () => {
  const quotaApp = () => {
    const app = express();
    const limiter = createAccountLimiter(60 * 60 * 1000, 2, 'Quota atingida.');
    app.use((req, res, next) => { req.user = { _id: req.get('x-conta') }; next(); });
    app.post('/operacao', limiter, (req, res) => res.json({ ok: true }));
    return app;
  };

  beforeEach(() => { config.rateLimitEnabled = true; });
  afterEach(() => { config.rateLimitEnabled = false; });

  test('cada conta tem a sua quota, independente do IP', async () => {
    const app = quotaApp();
    const statuses = [];
    for (let i = 0; i < 3; i += 1) statuses.push((await request(app).post('/operacao').set('x-conta', 'c1')).status);
    expect(statuses).toEqual([200, 200, 429]);
    expect((await request(app).post('/operacao').set('x-conta', 'c2')).status).toBe(200);
  });

  test('a resposta 429 tem uma mensagem em português e os cabeçalhos RateLimit', async () => {
    const app = quotaApp();
    await request(app).post('/operacao').set('x-conta', 'c3');
    await request(app).post('/operacao').set('x-conta', 'c3');
    const res = await request(app).post('/operacao').set('x-conta', 'c3');
    expect(res.status).toBe(429);
    expect(res.body.message).toBe('Quota atingida.');
    expect(res.headers).toHaveProperty('ratelimit-policy');
  });

  test('as quotas vêm das variáveis de ambiente', () => {
    const saved = { ...process.env };
    process.env.QUOTA_ORDERS_PER_HOUR = '7';
    process.env.RATE_LIMIT_API_MAX = '1234';
    process.env.OFF_MAX_REQUESTS_PER_MINUTE = '3';
    process.env.MAIL_MAX_PER_DAY = '9';
    try {
      jest.isolateModules(() => {
        const { config: isolated } = require('../config/env');
        expect(isolated.limits.ordersPerHour).toBe(7);
        expect(isolated.limits.apiMax).toBe(1234);
        expect(isolated.budgets.openFoodFactsPerMinute).toBe(3);
        expect(isolated.budgets.emailsPerDay).toBe(9);
      });
    } finally {
      process.env = saved;
    }
  });

  test('o webhook do Stripe não conta para o limite geral por IP', async () => {
    const saved = process.env.RATE_LIMIT_ENABLED;
    process.env.RATE_LIMIT_ENABLED = 'true';
    let app;
    try {
      jest.isolateModules(() => { app = require('../app')(); });
    } finally {
      if (saved === undefined) delete process.env.RATE_LIMIT_ENABLED; else process.env.RATE_LIMIT_ENABLED = saved;
    }
    const res = await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').send('{}');
    expect(res.headers).not.toHaveProperty('ratelimit-policy');
  });
});

describe('teto de pedidos à OpenFoodFacts', () => {
  const { offBudget } = fetchOpenFoodData;
  let savedLimit;
  beforeEach(() => { savedLimit = offBudget.limit; offBudget.reset(); });
  afterEach(() => { offBudget.limit = savedLimit; offBudget.reset(); });

  test('esgotado o orçamento do minuto, não faz mais pedidos (o prato fica sem dados nutricionais)', async () => {
    offBudget.limit = 1;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: { products: [] } });
    await fetchOpenFoodData('Francesinha');
    expect(await fetchOpenFoodData('Tripas')).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe('teto de emails', () => {
  const sent = [];
  beforeEach(() => {
    sent.length = 0;
    mailer.setTransporter({ sendMail: async (msg) => { sent.push(msg); return {}; } });
    mailer.dailyBudget.reset();
    mailer.perAddressBudget.reset();
  });
  afterEach(() => {
    mailer.setTransporter(null);
    mailer.dailyBudget.reset();
    mailer.perAddressBudget.reset();
  });

  test('cada destinatário recebe no máximo MAIL_MAX_PER_ADDRESS_PER_DAY emails por dia', async () => {
    const max = config.budgets.emailsPerAddressPerDay;
    for (let i = 0; i < max; i += 1) await mailer.sendMail({ to: 'ana@exemplo.pt', subject: 's', text: 't' });
    const error = await mailer.sendMail({ to: 'ANA@exemplo.pt', subject: 's', text: 't' }).catch((e) => e);
    expect(error).toBeInstanceOf(mailer.EmailBudgetError);
    expect(error.message).not.toMatch(/ana@exemplo\.pt/i);
    expect(sent).toHaveLength(max);
    await expect(mailer.sendMail({ to: 'rui@exemplo.pt', subject: 's', text: 't' })).resolves.toBeDefined();
  });

  test('o total diário também tem teto', async () => {
    const saved = mailer.dailyBudget.limit;
    mailer.dailyBudget.limit = 2;
    try {
      await mailer.sendMail({ to: 'a@exemplo.pt', subject: 's', text: 't' });
      await mailer.sendMail({ to: 'b@exemplo.pt', subject: 's', text: 't' });
      await expect(mailer.sendMail({ to: 'c@exemplo.pt', subject: 's', text: 't' })).rejects.toBeInstanceOf(mailer.EmailBudgetError);
    } finally {
      mailer.dailyBudget.limit = saved;
    }
  });
});

describe('registos sem dados pessoais', () => {
  test('logError regista o nome e o código do erro, nunca a mensagem', () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    logError('Contexto', Object.assign(new Error('550 ana@exemplo.pt rejeitado; token=abc'), { code: 'EENVELOPE' }));
    expect(log).toHaveBeenCalledWith('Contexto: Error (EENVELOPE)');
  });

  test('uma falha do SMTP na recuperação da password não escreve o email nem o link nos registos', async () => {
    const app = createApp();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockQuery(User, 'findOne', { _id: 'u1', email: 'ana@exemplo.pt', name: 'Ana Silva' });
    mockQuery(Restaurant, 'findOne', null);
    jest.spyOn(User, 'updateOne').mockResolvedValue({});
    mailer.setTransporter({ sendMail: async () => { throw Object.assign(new Error('550 5.1.1 <ana@exemplo.pt>: recipient rejected'), { code: 'EENVELOPE' }); } });
    try {
      const res = await request(app).post('/auth/forgot-password').send({ email: 'ana@exemplo.pt' });
      expect(res.status).toBe(200);
    } finally {
      mailer.setTransporter(null);
    }
    const output = log.mock.calls.flat().join(' ');
    expect(output).toMatch(/EENVELOPE/);
    expect(output).not.toMatch(/ana@exemplo\.pt|redefinir-password|token/);
  });
});
