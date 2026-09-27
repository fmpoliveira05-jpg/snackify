/**
 * Proteções transversais: CSRF (origem), cabeçalhos HTTP, uploads, pagamentos (vales e
 * webhook do Stripe) e documentação da API em produção. Sem MongoDB: tudo com mocks.
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const Stripe = require('stripe');
const createApp = require('../app');
const { config } = require('../config/env');
const User = require('../models/user');
const Order = require('../models/order');
const Cart = require('../models/cart');
const Restaurant = require('../models/restaurant');
const Voucher = require('../models/voucher');
const payments = require('../services/payments');
const { UPLOAD_ROOT, detectImageType } = require('../middlewares/uploadMiddleware');
const { asUser, fromClient, mockQuery, sessionCookie } = require('./support/helpers');

const app = createApp();

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const asCustomer = (req) => {
  mockQuery(User, 'findById', { _id: 'c1', userType: 'customer', address: {} });
  return asUser(req, 'c1', 'customer');
};

afterEach(() => jest.restoreAllMocks());

describe('CSRF: verificação da origem', () => {
  test('um pedido com sessão vindo de outro site é recusado', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    const res = await request(app)
      .post('/auth/logout-all')
      .set('Cookie', sessionCookie('c1', 'customer'))
      .set('Origin', 'https://site-malicioso.example');
    expect(res.status).toBe(403);
  });

  test('um pedido com sessão sem Origin nem Referer é recusado', async () => {
    const res = await request(app).post('/auth/logout').set('Cookie', sessionCookie('c1', 'customer'));
    expect(res.status).toBe(403);
  });

  test('o Referer da própria aplicação serve quando falta o Origin', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', sessionCookie('c1', 'customer'))
      .set('Referer', `${config.serverUrl}/restaurante/dashboard`);
    expect(res.status).toBe(200);
  });

  test('"Origin: null" é recusado', async () => {
    const res = await request(app).post('/auth/login').set('Origin', 'null').send({ username: 'a', password: 'b' });
    expect(res.status).toBe(403);
  });

  test('o login a partir de outro site é recusado (login CSRF)', async () => {
    const res = await request(app).post('/auth/login').set('Origin', 'https://evil.example').send({ username: 'a', password: 'b' });
    expect(res.status).toBe(403);
  });

  test('os pedidos GET não são afetados', async () => {
    const res = await request(app).get('/auth/me').set('Origin', 'https://evil.example');
    expect(res.status).toBe(401);
  });

  test('o webhook do Stripe fica fora da verificação da origem', async () => {
    const res = await request(app).post('/api/stripe/webhook').set('Origin', 'https://stripe.com').send('{}');
    expect(res.status).not.toBe(403);
  });
});

describe('cabeçalhos de segurança', () => {
  test('as páginas têm CSP com nonce, anti-framing, nosniff, Referrer-Policy e Permissions-Policy', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);

    const csp = res.headers['content-security-policy'];
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/object-src 'none'/);
    expect(csp).toMatch(/script-src-attr 'none'/);
    const nonce = csp.match(/'nonce-([^']+)'/)[1];
    expect(res.text).toContain(`nonce="${nonce}"`);
    expect(csp).toMatch(/https:\/\/challenges\.cloudflare\.com/);
    expect(csp).toMatch(/https:\/\/js\.stripe\.com/);

    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toMatch(/camera=\(\)/);
    expect(res.headers['permissions-policy']).toMatch(/geolocation=\(\)/);
    expect(res.headers['cross-origin-resource-policy']).toBe('same-site');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('cada pedido tem um nonce diferente', async () => {
    const a = await request(app).get('/');
    const b = await request(app).get('/');
    expect(a.headers['content-security-policy']).not.toBe(b.headers['content-security-policy']);
  });

  test('as páginas EJS não têm atributos de evento inline', () => {
    const viewsDir = path.join(__dirname, '..', 'views');
    const files = fs.readdirSync(viewsDir, { recursive: true }).filter((f) => f.endsWith('.ejs'));
    files.forEach((file) => {
      const html = fs.readFileSync(path.join(viewsDir, file), 'utf8');
      expect({ file, handlers: html.match(/\son[a-z]+\s*=\s*"/gi) }).toEqual({ file, handlers: null });
    });
  });

  test('corpos JSON acima de 100 KB são recusados', async () => {
    const res = await fromClient(request(app).post('/auth/login'))
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ username: 'a'.repeat(150 * 1024), password: 'x' }));
    expect(res.status).toBe(413);
  });

  test('os erros não revelam pormenores internos', async () => {
    mockQuery(Restaurant, 'findById', { _id: 'r1', isChecked: true });
    jest.spyOn(Order, 'findById').mockRejectedValue(Object.assign(new Error('Cast to ObjectId failed for value "x"'), { name: 'CastError' }));
    const res = await asUser(request(app).patch('/user/api/orders/x/state'), 'r1', 'restaurant').send({ state: 'entregue' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/ObjectId/);
  });
});

describe('ficheiros enviados', () => {
  const folder = path.join(UPLOAD_ROOT, 'profilePictures');
  const listUploads = () => (fs.existsSync(folder) ? fs.readdirSync(folder) : []);

  test('deteta o tipo real pelos primeiros bytes', () => {
    expect(detectImageType(PNG_1x1)).toBe('image/png');
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(detectImageType(Buffer.from('GIF89a------'))).toBe('image/gif');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBP'))).toBe('image/webp');
    expect(detectImageType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });

  test('um ficheiro de texto com extensão .png é recusado e apagado', async () => {
    const before = listUploads();
    const res = await fromClient(request(app).post('/register/registar-cliente'))
      .set('Accept', 'application/json')
      .attach('profilePicture', Buffer.from('<script>alert(1)</script>'), { filename: 'foto.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Só são aceites imagens/);
    expect(listUploads()).toEqual(before);
  });

  test('servidos com nosniff, CSP em sandbox e sem listar pastas', async () => {
    fs.mkdirSync(path.join(UPLOAD_ROOT, 'others'), { recursive: true });
    const file = path.join(UPLOAD_ROOT, 'others', `teste-${Date.now()}.png`);
    fs.writeFileSync(file, PNG_1x1);
    try {
      const res = await request(app).get(`/uploads/others/${path.basename(file)}`);
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
      expect(res.headers['content-disposition']).toBe('inline');

      const listing = await request(app).get('/uploads/others/');
      expect(listing.status).toBe(404);
      const dotfile = await request(app).get('/uploads/others/.gitkeep');
      expect([403, 404]).toContain(dotfile.status);
    } finally {
      fs.unlinkSync(file);
    }
  });
});

describe('vales de refeição', () => {
  test('sem pagamento simulado nem Stripe, comprar um vale não cria saldo', async () => {
    expect(config.allowSimulatedPayments).toBe(false);
    const create = jest.spyOn(Voucher, 'create');
    const res = await asCustomer(request(app).post('/cliente/api/vales')).send({ value: 10 });
    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  test('com Stripe, o vale fica pendente e sem saldo até o pagamento ser confirmado', async () => {
    const stripe = { checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' }) } } };
    jest.spyOn(payments, 'getStripe').mockReturnValue(stripe);
    const create = jest.spyOn(Voucher, 'create').mockImplementation(async (data) => ({ _id: 'v1', ...data }));
    jest.spyOn(Voucher, 'updateOne').mockResolvedValue({});

    const res = await asCustomer(request(app).post('/cliente/api/vales')).send({ value: 20 });

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(res.body).not.toHaveProperty('code');
    expect(create.mock.calls[0][0]).toMatchObject({ status: 'pending', balance: 0, value: 20 });
    const session = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(session.metadata).toEqual({ type: 'voucher', voucherId: 'v1', userId: 'c1' });
    expect(session.line_items[0].price_data.unit_amount).toBe(2000);
  });

  test('a compra simulada só existe fora de produção e com ALLOW_SIMULATED_PAYMENTS', async () => {
    config.allowSimulatedPayments = true;
    try {
      const create = jest.spyOn(Voucher, 'create').mockImplementation(async (data) => ({ _id: 'v1', ...data }));
      const res = await asCustomer(request(app).post('/cliente/api/vales')).send({ value: 5 });
      expect(res.status).toBe(201);
      expect(res.body.simulated).toBe(true);
      expect(create.mock.calls[0][0]).toMatchObject({ status: 'active', balance: 5, paymentMethod: 'simulado' });
    } finally {
      config.allowSimulatedPayments = false;
    }
  });

  describe('regresso do Stripe', () => {
    const pendingVoucher = { _id: 'v1', buyerId: 'c1', value: 10, status: 'pending', stripeSessionId: 'cs_1' };
    const session = (overrides = {}) => ({
      id: 'cs_1',
      payment_status: 'paid',
      status: 'complete',
      currency: 'eur',
      amount_total: 1000,
      metadata: { type: 'voucher', voucherId: 'v1', userId: 'c1' },
      ...overrides,
    });
    const withSession = (value) => {
      jest.spyOn(payments, 'getStripe').mockReturnValue({ checkout: { sessions: { retrieve: jest.fn().mockResolvedValue(value) } } });
    };

    test('um pagamento por concluir não ativa o vale', async () => {
      withSession(session({ payment_status: 'unpaid' }));
      jest.spyOn(Voucher, 'findById').mockResolvedValue(pendingVoucher);
      const update = jest.spyOn(Voucher, 'updateOne').mockResolvedValue({});
      const res = await request(app).get('/cliente/api/vales/pagamento-sucesso?voucherId=v1&session_id=cs_1');
      expect(res.status).toBe(303);
      expect(res.headers.location).toMatch(/pagamento=falhou/);
      expect(update).not.toHaveBeenCalled();
    });

    test('a sessão de outro vale não ativa este', async () => {
      withSession(session({ metadata: { type: 'voucher', voucherId: 'v2', userId: 'c1' } }));
      const update = jest.spyOn(Voucher, 'updateOne').mockResolvedValue({});
      const res = await request(app).get('/cliente/api/vales/pagamento-sucesso?voucherId=v1&session_id=cs_1');
      expect(res.headers.location).toMatch(/pagamento=falhou/);
      expect(update).not.toHaveBeenCalled();
    });

    test('um montante diferente do valor do vale não o ativa', async () => {
      withSession(session({ amount_total: 100 }));
      jest.spyOn(Voucher, 'findById').mockResolvedValue(pendingVoucher);
      const update = jest.spyOn(Voucher, 'updateOne').mockResolvedValue({});
      jest.spyOn(console, 'error').mockImplementation(() => {});
      await request(app).get('/cliente/api/vales/pagamento-sucesso?voucherId=v1&session_id=cs_1');
      expect(update).not.toHaveBeenCalled();
    });

    test('um pagamento confirmado ativa o vale só se ainda estiver pendente (idempotente)', async () => {
      withSession(session());
      jest.spyOn(Voucher, 'findById').mockResolvedValue(pendingVoucher);
      const update = jest.spyOn(Voucher, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
      const res = await request(app).get('/cliente/api/vales/pagamento-sucesso?voucherId=v1&session_id=cs_1');
      expect(res.headers.location).toBe(`${config.clientUrl}/cliente/vales?pagamento=sucesso`);
      const [filter, changes] = update.mock.calls[0];
      expect(filter).toEqual({ _id: 'v1', status: 'pending' });
      expect(changes.$set).toMatchObject({ status: 'active', balance: 10 });
    });
  });

  test('só vales ativos servem para pagar encomendas', async () => {
    mockQuery(Order, 'find', []);
    mockQuery(Cart, 'findOne', {
      items: [{ dishId: { _id: 'd1', restaurantId: 'r1', pricePerDose: [{ dose: '1', price: 10 }] }, amount: 1, dose: '1' }],
      timeout: new Date(Date.now() + 60000),
      save: jest.fn(),
    });
    mockQuery(Restaurant, 'findOne', { _id: 'r1', settings: {}, address: {} });
    jest.spyOn(Order, 'countDocuments').mockResolvedValue(0);
    const findVoucher = jest.spyOn(Voucher, 'findOne').mockResolvedValue(null);

    const res = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar'))
      .send({ fulfilment: 'levantamento', paymentMethod: 'online', voucherCode: 'VALE-ABC123' });

    expect(res.status).toBe(400);
    expect(findVoucher.mock.calls[0][0]).toMatchObject({ code: 'VALE-ABC123', ownerId: 'c1', status: 'active' });
  });
});

describe('webhook do Stripe', () => {
  const secret = 'whsec_teste';
  const stripe = Stripe('sk_test_apenas_para_testes');

  beforeEach(() => {
    config.stripeSecretKey = 'sk_test_apenas_para_testes';
    config.stripeWebhookSecret = secret;
  });
  afterEach(() => {
    config.stripeSecretKey = null;
    config.stripeWebhookSecret = null;
  });

  const eventPayload = (object) => JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type: 'checkout.session.completed',
    data: { object },
  });

  test('sem configuração responde 503', async () => {
    config.stripeWebhookSecret = null;
    const res = await request(app).post('/api/stripe/webhook').set('Content-Type', 'application/json').send('{}');
    expect(res.status).toBe(503);
  });

  test('uma assinatura inválida é recusada', async () => {
    const update = jest.spyOn(Voucher, 'updateOne');
    const payload = eventPayload({ id: 'cs_1', payment_status: 'paid', metadata: { type: 'voucher', voucherId: 'v1' } });
    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=assinatura-falsa')
      .send(payload);
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  test('um evento assinado ativa o vale pago', async () => {
    jest.spyOn(Voucher, 'findById').mockResolvedValue({ _id: 'v1', buyerId: 'c1', value: 50, status: 'pending', stripeSessionId: 'cs_1' });
    const update = jest.spyOn(Voucher, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    const payload = eventPayload({
      id: 'cs_1', payment_status: 'paid', status: 'complete', currency: 'eur', amount_total: 5000,
      metadata: { type: 'voucher', voucherId: 'v1', userId: 'c1' },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });

    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      { _id: 'v1', status: 'pending' },
      { $set: expect.objectContaining({ status: 'active', balance: 50 }) },
    );
  });

  test('um evento assinado marca a encomenda como paga', async () => {
    jest.spyOn(Order, 'findById').mockResolvedValue({ _id: 'o1', userId: 'c1', total: 12.5, discount: 2.5 });
    const update = jest.spyOn(Order, 'findOneAndUpdate').mockResolvedValue({ _id: 'o1' });
    const payload = eventPayload({
      id: 'cs_2', payment_status: 'paid', status: 'complete', currency: 'eur', amount_total: 1000, payment_intent: 'pi_1',
      metadata: { type: 'order', orderId: 'o1', userId: 'c1' },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });

    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      { _id: 'o1', state: 'pendente' },
      { $set: expect.objectContaining({ state: 'concluída', stripeSessionId: 'cs_2', paymentIntentId: 'pi_1' }) },
      expect.anything(),
    );
  });
});

describe('consultas ao MongoDB', () => {
  test('os operadores do servidor sobrevivem ao sanitizeFilter; os do pedido não', () => {
    const { trusted } = require('mongoose');
    const fromServer = Voucher.findOne({ balance: trusted({ $gt: 0 }) });
    fromServer._castConditions();
    expect(fromServer.getFilter().balance.$gt).toBe(0);
    expect(fromServer.getFilter().balance.$eq).toBeUndefined();

    const fromRequest = Voucher.findOne({ code: { $ne: null } });
    fromRequest._castConditions();
    expect(fromRequest.getFilter()).toEqual({ code: { $eq: { $ne: null } } });
  });
});

describe('produção', () => {
  test('o Swagger não é publicado e o cookie usa o prefixo __Host-', () => {
    const saved = { ...process.env };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'x'.repeat(40);
    delete process.env.ENABLE_API_DOCS;
    try {
      jest.isolateModules(() => {
        const { config: prodConfig } = require('../config/env');
        expect(prodConfig.enableApiDocs).toBe(false);
        expect(prodConfig.sessionCookieName).toBe('__Host-snackify');
        expect(prodConfig.allowSimulatedPayments).toBe(false);
      });
    } finally {
      process.env = saved;
    }
  });

  test('GET /api-docs responde 404 em produção', async () => {
    const saved = { ...process.env };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'x'.repeat(40);
    process.env.ALLOW_SIMULATED_PAYMENTS = 'true';
    delete process.env.ENABLE_API_DOCS;
    let prodApp;
    let prodConfig;
    try {
      jest.isolateModules(() => {
        prodApp = require('../app')();
        prodConfig = require('../config/env').config;
      });
    } finally {
      process.env = saved;
    }
    expect(prodConfig.allowSimulatedPayments).toBe(false);
    const res = await request(prodApp).get('/api-docs/');
    expect(res.status).toBe(404);
    expect(res.headers['strict-transport-security']).toMatch(/max-age=31536000/);
  });

  test('em produção um JWT_SECRET curto impede o arranque', () => {
    const saved = { ...process.env };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'curto';
    process.env.MONGODB_URI = 'mongodb://localhost/x';
    try {
      jest.isolateModules(() => {
        const { assertRequiredConfig } = require('../config/env');
        expect(() => assertRequiredConfig()).toThrow(/pelo menos 32/);
      });
    } finally {
      process.env = saved;
    }
  });
});

