/**
 * Concorrência sobre dinheiro e limites, contra um MongoDB REAL (Promise.all de pedidos
 * simultâneos). Prova que cada pagamento, saldo e lugar só é aplicado uma vez.
 */
const request = require('supertest');
const createApp = require('../app');
const payments = require('../services/payments');
const { reserveVoucherBalance } = require('../services/voucherBalance');
const { sessionCookie, ORIGIN } = require('../tests/support/helpers');
const db = require('./support/db');

const { Order, Voucher, Restaurant, Cart } = db.models;
const app = createApp();

const asCustomer = (req, customer) => req.set('Cookie', sessionCookie(customer._id, 'customer')).set('Origin', ORIGIN);

beforeAll(() => db.connect('concorrencia'));
afterAll(() => db.disconnect());
afterEach(() => jest.restoreAllMocks());

const paidSession = (order, extra = {}) => ({
  id: 'cs_test_concorrencia',
  payment_status: 'paid',
  status: 'complete',
  currency: 'eur',
  amount_total: Math.round((order.total - (order.discount || 0)) * 100),
  payment_intent: 'pi_test_concorrencia',
  metadata: { type: 'order', orderId: String(order._id), userId: String(order.userId) },
  ...extra,
});

describe('pagamento de encomendas', () => {
  let customer;
  let restaurant;

  beforeAll(async () => {
    customer = await db.createCustomer();
    restaurant = await db.createRestaurant();
  });

  const pendingOrder = (extra = {}) => Order.create({
    userId: customer._id,
    restaurantId: restaurant._id,
    dishes: [],
    state: 'pendente',
    total: 12.5,
    discount: 0,
    orderCode: `ORD-${Math.random().toString(36).slice(2)}`,
    ...extra,
  });

  test('regresso do cliente e webhook em simultâneo (20x): o pagamento é aplicado uma só vez', async () => {
    const order = await pendingOrder();
    const session = paidSession(order);
    const event = { type: 'checkout.session.completed', data: { object: session } };

    const results = await Promise.all([
      ...Array.from({ length: 10 }, () => payments.confirmOrderPayment(session, order._id)),
      ...Array.from({ length: 10 }, () => payments.handleStripeEvent(event).then(() => ({ ok: true, applied: 'webhook' }))),
    ]);

    const appliedByReturn = results.filter((r) => r.applied === true).length;
    const saved = await Order.findById(order._id).lean();
    expect(saved.state).toBe('concluída');
    expect(saved.stripeSessionId).toBe(session.id);
    expect(saved.paymentIntentId).toBe('pi_test_concorrencia');
    // Os 10 regressos: no máximo um aplicou (os webhooks podem ter ganho a corrida).
    expect(appliedByReturn).toBeLessThanOrEqual(1);
    expect(results.slice(0, 10).every((r) => r.ok)).toBe(true);
  });

  test('só um pedido aplica o pagamento quando todos chegam ao mesmo tempo (10x)', async () => {
    const order = await pendingOrder();
    const session = paidSession(order, { id: 'cs_test_dez', payment_intent: 'pi_test_dez' });
    const results = await Promise.all(Array.from({ length: 10 }, () => payments.confirmOrderPayment(session, order._id)));
    expect(results.filter((r) => r.applied).length).toBe(1);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  test('o mesmo pagamento (PaymentIntent) não paga duas encomendas', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const first = await pendingOrder();
    const second = await pendingOrder();
    const shared = { payment_intent: 'pi_test_partilhado' };
    const a = await payments.confirmOrderPayment(paidSession(first, { id: 'cs_a', ...shared }), first._id);
    const b = await payments.confirmOrderPayment(paidSession(second, { id: 'cs_b', ...shared }), second._id);
    expect(a).toEqual({ ok: true, applied: true });
    expect(b).toEqual({ ok: false, applied: false });
    expect((await Order.findById(second._id).lean()).state).toBe('pendente');
  });

  test('pagamento e cancelamento em simultâneo: só um dos dois acontece', async () => {
    const order = await pendingOrder({ orderDate: new Date() });
    const session = paidSession(order, { id: 'cs_cancel', payment_intent: 'pi_cancel' });
    const [payment, cancel] = await Promise.all([
      payments.confirmOrderPayment(session, order._id),
      asCustomer(request(app).post(`/user/perfil/encomendas/${order._id}/cancelar`), customer),
    ]);
    const saved = await Order.findById(order._id).lean();
    if (payment.applied) {
      expect(saved.state).toBe('concluída');
      // 400 se o cancelamento já leu o estado pago; 409 se perdeu a corrida na escrita.
      expect([400, 409]).toContain(cancel.status);
    } else {
      expect(saved.state).toBe('cancelada');
      expect(cancel.status).toBe(200);
    }
  });

  test('cliques simultâneos em "Pagar agora" (8x) recebem a mesma sessão do Stripe', async () => {
    const order = await pendingOrder({ dishes: [] });
    const sessions = new Map();
    const create = jest.fn(async (params, { idempotencyKey }) => {
      // Como o Stripe: a mesma chave de idempotência devolve a mesma sessão.
      if (!sessions.has(idempotencyKey)) {
        const id = `cs_test_${sessions.size + 1}`;
        sessions.set(idempotencyKey, { id, status: 'open', url: `https://checkout.stripe.com/c/pay/${id}` });
      }
      await new Promise((r) => { setTimeout(r, 20); });
      return sessions.get(idempotencyKey);
    });
    const retrieve = jest.fn(async (id) => [...sessions.values()].find((s) => s.id === id));
    jest.spyOn(payments, 'getStripe').mockReturnValue({ checkout: { sessions: { create, retrieve } } });

    const responses = await Promise.all(Array.from({ length: 8 }, () => (
      asCustomer(request(app).post('/cliente/api/carrinho/create-checkout-session'), customer).send({ orderId: String(order._id) })
    )));

    const urls = new Set(responses.map((r) => r.body.url));
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(urls.size).toBe(1);
    expect(sessions.size).toBe(1);
    expect((await Order.findById(order._id).lean()).stripeSessionId).toBe('cs_test_1');
  });
});

describe('vales', () => {
  test('ativação do vale em simultâneo (10x): o saldo é dado uma só vez', async () => {
    const buyer = await db.createCustomer();
    const voucher = await Voucher.create({
      code: 'VALE-CONC01', buyerId: buyer._id, ownerId: buyer._id, value: 20, balance: 0, status: 'pending', stripeSessionId: 'cs_vale',
    });
    const session = {
      id: 'cs_vale', payment_status: 'paid', status: 'complete', currency: 'eur', amount_total: 2000, payment_intent: 'pi_vale',
      metadata: { type: 'voucher', voucherId: String(voucher._id), userId: String(buyer._id) },
    };
    const results = await Promise.all(Array.from({ length: 10 }, () => payments.confirmVoucherPayment(session, voucher._id)));
    expect(results.filter((r) => r.applied).length).toBe(1);
    const saved = await Voucher.findById(voucher._id).lean();
    expect(saved.status).toBe('active');
    expect(saved.balance).toBe(20);
  });

  test('10 descontos simultâneos de 3 € num vale de 10 €: só passam 3 e o saldo nunca fica negativo', async () => {
    const owner = await db.createCustomer();
    await Voucher.create({ code: 'VALE-CONC02', buyerId: owner._id, ownerId: owner._id, value: 10, balance: 10, status: 'active' });

    const results = await Promise.all(Array.from({ length: 10 }, () => (
      // Encomendas de 3 € cada: o vale paga 3 € em cada uma enquanto tiver saldo.
      reserveVoucherBalance({ code: 'VALE-CONC02', ownerId: owner._id, total: 3 })
    )));

    const granted = results.filter(Boolean);
    const totalDiscount = granted.reduce((sum, r) => sum + r.discount, 0);
    const saved = await Voucher.findOne({ code: 'VALE-CONC02' }).lean();
    expect(saved.balance).toBeGreaterThanOrEqual(0);
    expect(Math.round((totalDiscount + saved.balance) * 100)).toBe(1000);
    expect(granted.filter((r) => r.discount === 3).length).toBe(3);
  });

  test('descontos que deixam cêntimos não acumulam erros de arredondamento', async () => {
    const owner = await db.createCustomer();
    await Voucher.create({ code: 'VALE-CONC03', buyerId: owner._id, ownerId: owner._id, value: 10, balance: 10, status: 'active' });
    await reserveVoucherBalance({ code: 'VALE-CONC03', ownerId: owner._id, total: 8.55 });
    expect((await Voucher.findOne({ code: 'VALE-CONC03' }).lean()).balance).toBe(1.45);
  });
});

describe('encomendas', () => {
  let category;
  beforeAll(async () => { category = await db.createCategory(); });

  test('5 pedidos simultâneos com o mesmo carrinho criam uma só encomenda', async () => {
    const customer = await db.createCustomer();
    const restaurant = await db.createRestaurant();
    const dish = await db.createDish(restaurant, category);
    await db.fillCart(customer, dish, 2);

    const responses = await Promise.all(Array.from({ length: 5 }, () => (
      asCustomer(request(app).post('/cliente/api/carrinho/finalizar'), customer).send({ fulfilment: 'levantamento' })
    )));

    expect(responses.filter((r) => r.status === 201).length).toBe(1);
    responses.filter((r) => r.status !== 201).forEach((r) => expect([400, 409]).toContain(r.status));
    expect(await Order.countDocuments({ userId: customer._id })).toBe(1);
    const cart = await Cart.findOne({ userId: customer._id }).lean();
    expect(cart.items).toHaveLength(0);
    expect(cart.checkoutLockedAt).toBeUndefined();
  });

  test('5 repetições com o mesmo Idempotency-Key devolvem todas a mesma encomenda', async () => {
    const customer = await db.createCustomer();
    const restaurant = await db.createRestaurant();
    const dish = await db.createDish(restaurant, category);
    await db.fillCart(customer, dish);

    const responses = await Promise.all(Array.from({ length: 5 }, () => (
      asCustomer(request(app).post('/cliente/api/carrinho/finalizar'), customer)
        .set('Idempotency-Key', 'encomenda-teste-0001')
        .send({ fulfilment: 'levantamento' })
    )));

    expect(responses.map((r) => r.status).sort()).toEqual([200, 200, 200, 200, 201]);
    expect(new Set(responses.map((r) => String(r.body.orderId))).size).toBe(1);
    expect(await Order.countDocuments({ userId: customer._id })).toBe(1);
  });

  test('limite de 3 encomendas em curso com 8 clientes em simultâneo: entram exatamente 3', async () => {
    const restaurant = await db.createRestaurant({ settings: { maxActiveOrders: 3 } });
    const dish = await db.createDish(restaurant, category);
    const customers = await Promise.all(Array.from({ length: 8 }, () => db.createCustomer()));
    await Promise.all(customers.map((c) => db.fillCart(c, dish)));

    const responses = await Promise.all(customers.map((c) => (
      asCustomer(request(app).post('/cliente/api/carrinho/finalizar'), c).send({ fulfilment: 'levantamento' })
    )));

    expect(responses.filter((r) => r.status === 201).length).toBe(3);
    expect(responses.filter((r) => r.status === 409).length).toBe(5);
    expect(await Order.countDocuments({ restaurantId: restaurant._id })).toBe(3);
    const saved = await Restaurant.findById(restaurant._id).select('+activeOrderIds').lean();
    expect(saved.activeOrderIds).toHaveLength(3);
  });

  test('um restaurante antigo (sem lista de lugares) conta as encomendas já em curso', async () => {
    const restaurant = await db.createRestaurant({ settings: { maxActiveOrders: 3 } });
    const dish = await db.createDish(restaurant, category);
    const older = await db.createCustomer();
    await Order.create([1, 2].map(() => ({ userId: older._id, restaurantId: restaurant._id, state: 'em preparação', total: 10, dishes: [] })));
    const customers = await Promise.all(Array.from({ length: 3 }, () => db.createCustomer()));
    await Promise.all(customers.map((c) => db.fillCart(c, dish)));

    const responses = await Promise.all(customers.map((c) => (
      asCustomer(request(app).post('/cliente/api/carrinho/finalizar'), c).send({ fulfilment: 'levantamento' })
    )));

    expect(responses.filter((r) => r.status === 201).length).toBe(1);
  });

  test('uma encomenda entregue liberta o lugar para a seguinte', async () => {
    const restaurant = await db.createRestaurant({ settings: { maxActiveOrders: 1 } });
    const dish = await db.createDish(restaurant, category);
    const [first, second] = await Promise.all([db.createCustomer(), db.createCustomer()]);
    await Promise.all([db.fillCart(first, dish), db.fillCart(second, dish)]);

    const created = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar'), first).send({ fulfilment: 'levantamento' });
    expect(created.status).toBe(201);
    const blocked = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar'), second).send({ fulfilment: 'levantamento' });
    expect(blocked.status).toBe(409);

    const restaurantCookie = sessionCookie(restaurant._id, 'restaurant');
    for (const state of ['em preparação', 'entregue']) {
      const res = await request(app).patch(`/user/api/orders/${created.body.orderId}/state`)
        .set('Cookie', restaurantCookie).set('Origin', ORIGIN).send({ state });
      expect(res.status).toBe(200);
    }
    await db.fillCart(second, dish);
    const accepted = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar'), second).send({ fulfilment: 'levantamento' });
    expect(accepted.status).toBe(201);
  });

  test('duas encomendas simultâneas pagas com o mesmo vale não gastam mais do que o saldo', async () => {
    const customer = await db.createCustomer();
    const restaurant = await db.createRestaurant();
    const dish = await db.createDish(restaurant, category);
    await Voucher.create({ code: 'VALE-CONC04', buyerId: customer._id, ownerId: customer._id, value: 10, balance: 10, status: 'active' });
    await db.fillCart(customer, dish);

    const responses = await Promise.all(Array.from({ length: 4 }, () => (
      asCustomer(request(app).post('/cliente/api/carrinho/finalizar'), customer).send({ fulfilment: 'levantamento', voucherCode: 'VALE-CONC04' })
    )));

    expect(responses.filter((r) => r.status === 201).length).toBe(1);
    const voucher = await Voucher.findOne({ code: 'VALE-CONC04' }).lean();
    const discounts = (await Order.find({ voucherCode: 'VALE-CONC04' }).lean()).reduce((s, o) => s + o.discount, 0);
    expect(voucher.balance + discounts).toBe(10);
  });

  test('cancelamentos simultâneos (5x) reembolsam o vale uma só vez', async () => {
    const customer = await db.createCustomer();
    const restaurant = await db.createRestaurant();
    await Voucher.create({ code: 'VALE-CONC05', buyerId: customer._id, ownerId: customer._id, value: 10, balance: 4, status: 'active' });
    const order = await Order.create({
      userId: customer._id, restaurantId: restaurant._id, state: 'pendente', orderDate: new Date(), total: 16, discount: 6, voucherCode: 'VALE-CONC05', dishes: [],
    });

    const responses = await Promise.all(Array.from({ length: 5 }, () => (
      asCustomer(request(app).post(`/user/perfil/encomendas/${order._id}/cancelar`), customer)
    )));

    expect(responses.filter((r) => r.status === 200).length).toBe(1);
    expect((await Voucher.findOne({ code: 'VALE-CONC05' }).lean()).balance).toBe(10);
  });
});
