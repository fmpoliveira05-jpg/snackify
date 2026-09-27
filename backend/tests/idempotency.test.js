/**
 * Pedidos repetidos e pagamentos em duplicado (versão com mocks; os testes de concorrência
 * reais, contra o MongoDB, estão em tests-integracao/).
 */
const request = require('supertest');
const createApp = require('../app');
const payments = require('../services/payments');
const User = require('../models/user');
const Order = require('../models/order');
const Cart = require('../models/cart');
const Voucher = require('../models/voucher');
const Restaurant = require('../models/restaurant');
const { asUser, mockQuery } = require('./support/helpers');

const app = createApp();

afterEach(() => jest.restoreAllMocks());

const asCustomer = (req) => {
  mockQuery(User, 'findById', { _id: 'c1', userType: 'customer', address: {} });
  return asUser(req, 'c1', 'customer');
};

const cartWithItems = () => ({
  _id: 'cart1',
  items: [{ dishId: { _id: 'd1', restaurantId: 'r1', pricePerDose: [{ dose: '1', price: 10 }] }, amount: 1, dose: '1' }],
  timeout: new Date(Date.now() + 60000),
  save: jest.fn(),
});

describe('finalizar encomenda', () => {
  test('um Idempotency-Key já usado devolve a mesma encomenda, sem criar outra', async () => {
    mockQuery(Order, 'findOne', { _id: 'o1', orderCode: 'ORD-1', total: 10, discount: 0 });
    const create = jest.spyOn(Order, 'create');
    const res = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar'))
      .set('Idempotency-Key', 'chave-de-teste-123')
      .send({ fulfilment: 'levantamento' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ orderId: 'o1', orderCode: 'ORD-1', replayed: true });
    expect(create).not.toHaveBeenCalled();
  });

  test('um Idempotency-Key mal formado é recusado', async () => {
    const res = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar'))
      .set('Idempotency-Key', 'x')
      .send({});
    expect(res.status).toBe(400);
  });

  test('se o carrinho já estiver a ser finalizado noutro pedido, responde 409', async () => {
    mockQuery(Order, 'find', []);
    mockQuery(Cart, 'findOne', cartWithItems());
    mockQuery(Restaurant, 'findOne', { _id: 'r1', settings: {}, address: {} });
    jest.spyOn(Order, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(Cart, 'findOneAndUpdate').mockResolvedValue(null);
    const create = jest.spyOn(Order, 'create');

    const res = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar')).send({ fulfilment: 'levantamento' });

    expect(res.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  test('sem lugar no limite do restaurante, a encomenda criada é apagada e o carrinho libertado', async () => {
    mockQuery(Order, 'find', []);
    mockQuery(Cart, 'findOne', cartWithItems());
    mockQuery(Restaurant, 'findOne', { _id: 'r1', settings: { maxActiveOrders: 1 }, address: {} });
    mockQuery(Restaurant, 'findById', { _id: 'r1', activeOrderIds: ['outra'] });
    jest.spyOn(Order, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(Cart, 'findOneAndUpdate').mockResolvedValue({ _id: 'cart1' });
    jest.spyOn(Order, 'create').mockResolvedValue({ _id: 'o9', orderCode: 'ORD-9' });
    jest.spyOn(Restaurant, 'updateOne').mockResolvedValue({ modifiedCount: 0, matchedCount: 0 });
    const remove = jest.spyOn(Order, 'deleteOne').mockResolvedValue({});
    const unlock = jest.spyOn(Cart, 'updateOne').mockResolvedValue({});

    const res = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar')).send({ fulfilment: 'levantamento' });

    expect(res.status).toBe(409);
    expect(remove).toHaveBeenCalledWith({ _id: 'o9' });
    expect(unlock).toHaveBeenCalledWith({ _id: 'cart1' }, { $unset: { checkoutLockedAt: 1 } });
  });
});

describe('Stripe: uma sessão de pagamento por encomenda', () => {
  const pendingOrder = (extra = {}) => ({
    _id: 'o1', userId: 'c1', state: 'pendente', paymentMethod: 'online', orderCode: 'ORD-1', total: 10, discount: 0,
    dishes: [{ dishId: { name: 'Sopa', pricePerDose: [{ dose: '1', price: 10 }] }, dose: '1', amount: 1 }],
    ...extra,
  });

  test('reutiliza a sessão aberta em vez de criar outra', async () => {
    mockQuery(Order, 'findOne', pendingOrder({ stripeSessionId: 'cs_aberta' }));
    const stripe = {
      checkout: {
        sessions: {
          retrieve: jest.fn().mockResolvedValue({ id: 'cs_aberta', status: 'open', url: 'https://checkout.stripe.com/c/pay/cs_aberta' }),
          create: jest.fn(),
        },
      },
    };
    jest.spyOn(payments, 'getStripe').mockReturnValue(stripe);

    const res = await asCustomer(request(app).post('/cliente/api/carrinho/create-checkout-session')).send({ orderId: 'o1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_aberta', reused: true });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  test('cria a sessão com uma chave de idempotência e guarda-a por compare-and-set', async () => {
    mockQuery(Order, 'findOne', pendingOrder());
    const stripe = { checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_nova', url: 'https://checkout.stripe.com/c/pay/cs_nova' }) } } };
    jest.spyOn(payments, 'getStripe').mockReturnValue(stripe);
    const save = jest.spyOn(Order, 'updateOne').mockResolvedValue({ modifiedCount: 1 });

    const res = await asCustomer(request(app).post('/cliente/api/carrinho/create-checkout-session')).send({ orderId: 'o1' });

    expect(res.status).toBe(200);
    expect(stripe.checkout.sessions.create.mock.calls[0][1]).toEqual({ idempotencyKey: 'snackify-encomenda-o1-inicial' }); // gitleaks:allow (chave de teste)
    const [filter, update] = save.mock.calls[0];
    expect(filter).toMatchObject({ _id: 'o1', state: 'pendente' });
    expect(filter.stripeSessionId.$exists).toBe(false);
    expect(update).toEqual({ $set: { stripeSessionId: 'cs_nova' } });
  });

  test('a compra de um vale envia uma chave de idempotência ao Stripe', async () => {
    const stripe = { checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_v', url: 'https://checkout.stripe.com/c/pay/cs_v' }) } } };
    jest.spyOn(payments, 'getStripe').mockReturnValue(stripe);
    jest.spyOn(Voucher, 'create').mockImplementation(async (data) => ({ _id: 'v1', ...data }));
    jest.spyOn(Voucher, 'updateOne').mockResolvedValue({});

    await asCustomer(request(app).post('/cliente/api/vales')).send({ value: 10 });

    expect(stripe.checkout.sessions.create.mock.calls[0][1]).toEqual({ idempotencyKey: 'snackify-vale-v1' }); // gitleaks:allow (chave de teste)
  });

  test('uma compra de vale repetida (mesmo Idempotency-Key) devolve a mesma sessão', async () => {
    const stripe = {
      checkout: {
        sessions: {
          retrieve: jest.fn().mockResolvedValue({ status: 'open', url: 'https://checkout.stripe.com/c/pay/cs_v' }),
          create: jest.fn(),
        },
      },
    };
    jest.spyOn(payments, 'getStripe').mockReturnValue(stripe);
    mockQuery(Voucher, 'findOne', { _id: 'v1', status: 'pending', stripeSessionId: 'cs_v' });
    const create = jest.spyOn(Voucher, 'create');

    const res = await asCustomer(request(app).post('/cliente/api/vales'))
      .set('Idempotency-Key', 'compra-vale-0001')
      .send({ value: 10 });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://checkout.stripe.com/c/pay/cs_v');
    expect(create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe('confirmação do pagamento', () => {
  const session = (extra = {}) => ({
    id: 'cs_1', payment_status: 'paid', status: 'complete', currency: 'eur', amount_total: 1000,
    metadata: { type: 'order', orderId: 'o1', userId: 'c1' }, ...extra,
  });

  test('um montante diferente do total da encomenda não a marca como paga', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Order, 'findById').mockResolvedValue({ _id: 'o1', userId: 'c1', total: 10, discount: 0 });
    const update = jest.spyOn(Order, 'findOneAndUpdate');
    expect(await payments.confirmOrderPayment(session({ amount_total: 1 }), 'o1')).toEqual({ ok: false, applied: false });
    expect(update).not.toHaveBeenCalled();
  });

  test('confirmar a mesma sessão outra vez não volta a aplicar o pagamento', async () => {
    jest.spyOn(Order, 'findById')
      .mockResolvedValueOnce({ _id: 'o1', userId: 'c1', total: 10, discount: 0 })
      .mockReturnValueOnce({ select: () => ({ lean: async () => ({ state: 'concluída', stripeSessionId: 'cs_1' }) }) });
    jest.spyOn(Order, 'findOneAndUpdate').mockResolvedValue(null);
    expect(await payments.confirmOrderPayment(session(), 'o1')).toEqual({ ok: true, applied: false });
  });

  test('um pagamento de uma encomenda cancelada não a reativa', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Order, 'findById')
      .mockResolvedValueOnce({ _id: 'o1', userId: 'c1', total: 10, discount: 0 })
      .mockReturnValueOnce({ select: () => ({ lean: async () => ({ state: 'cancelada', stripeSessionId: 'cs_1' }) }) });
    jest.spyOn(Order, 'findOneAndUpdate').mockResolvedValue(null);
    expect(await payments.confirmOrderPayment(session(), 'o1')).toEqual({ ok: false, applied: false });
  });
});

describe('cancelamento', () => {
  test('um segundo cancelamento simultâneo não reembolsa o vale outra vez', async () => {
    jest.spyOn(Order, 'findById').mockResolvedValue({ _id: 'o1', userId: 'c1', state: 'pendente', orderDate: new Date() });
    jest.spyOn(Order, 'findOneAndUpdate').mockResolvedValue(null);
    const refund = jest.spyOn(Voucher, 'findOneAndUpdate');
    const res = await asCustomer(request(app).post('/user/perfil/encomendas/o1/cancelar'));
    expect(res.status).toBe(409);
    expect(refund).not.toHaveBeenCalled();
  });
});
