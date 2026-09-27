/**
 * Paginação das listas e índices definidos nos modelos.
 */
const request = require('supertest');
const createApp = require('../app');
const { parsePagination, MAX_LIMIT } = require('../utils/pagination');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');
const Voucher = require('../models/voucher');
const Dish = require('../models/dish');
const Cart = require('../models/cart');
const Review = require('../models/review');
const { asUser, mockQuery, fakeQuery } = require('./support/helpers');

const app = createApp();

afterEach(() => jest.restoreAllMocks());

describe('parsePagination', () => {
  test('usa valores por omissão e limita o tamanho máximo da página', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 50, skip: 0 });
    expect(parsePagination({ pagina: '3', limite: '10' })).toEqual({ page: 3, limit: 10, skip: 20 });
    expect(parsePagination({ page: '2', limit: '100000' }).limit).toBe(MAX_LIMIT);
  });

  test('ignora valores inválidos, negativos ou que não sejam texto', () => {
    expect(parsePagination({ pagina: '-1', limite: '0' })).toEqual({ page: 1, limit: 50, skip: 0 });
    expect(parsePagination({ pagina: { $gt: 1 }, limite: ['5'] })).toEqual({ page: 1, limit: 50, skip: 0 });
  });
});

describe('listas paginadas da API', () => {
  const asCustomer = (req) => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    return asUser(req, 'c1', 'customer');
  };

  test('restaurantes: devolve a página pedida e o total nos cabeçalhos', async () => {
    mockQuery(Restaurant, 'find', ['A', 'B', 'C'].map((name, i) => ({ _id: `r${i}`, name, address: {} })));
    const res = await asCustomer(request(app).get('/cliente/api/restaurantes?pagina=2&limite=2'));
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.name)).toEqual(['C']);
    expect(res.headers['x-total-count']).toBe('3');
    expect(res.headers['x-page']).toBe('2');
    expect(res.headers['x-page-size']).toBe('2');
  });

  test('histórico de encomendas: ordena, salta e limita na base de dados', async () => {
    const calls = {};
    const query = fakeQuery([]);
    ['sort', 'skip', 'limit'].forEach((method) => {
      query[method] = (arg) => { calls[method] = arg; return query; };
    });
    jest.spyOn(Order, 'find').mockReturnValue(query);
    jest.spyOn(Order, 'countDocuments').mockResolvedValue(42);

    const res = await asCustomer(request(app).get('/user/perfil/encomendas?pagina=3&limite=10'));

    expect(res.status).toBe(200);
    expect(calls).toEqual({ sort: { orderDate: -1 }, skip: 20, limit: 10 });
    expect(res.headers['x-total-count']).toBe('42');
  });

  test('os cabeçalhos da paginação são expostos ao cliente Angular (CORS)', async () => {
    const res = await request(app).get('/auth/me').set('Origin', 'http://localhost:4200');
    expect(res.headers['access-control-expose-headers']).toMatch(/X-Total-Count/);
  });
});

describe('índices dos modelos', () => {
  const indexes = (Model) => Model.schema.indexes().map(([keys, options]) => ({ keys, options }));
  const find = (Model, keys) => indexes(Model).find((i) => JSON.stringify(i.keys) === JSON.stringify(keys));

  test.each([
    [Order, { userId: 1, orderDate: -1 }],
    [Order, { restaurantId: 1, orderDate: -1 }],
    [Order, { restaurantId: 1, state: 1 }],
    [Voucher, { ownerId: 1, status: 1, createdAt: -1 }],
    [Dish, { restaurantId: 1, menuId: 1 }],
    [Dish, { menuId: 1 }],
    [Review, { restaurantId: 1, createdAt: -1 }],
  ])('%p tem o índice %p', (Model, keys) => {
    expect(find(Model, keys)).toBeDefined();
  });

  test.each([
    [Order, 'stripeSessionId'],
    [Order, 'paymentIntentId'],
    [Voucher, 'stripeSessionId'],
    [Voucher, 'paymentIntentId'],
  ])('%p.%s é único quando existe (impede pagamentos em duplicado)', (Model, field) => {
    const index = find(Model, { [field]: 1 });
    expect(index.options.unique).toBe(true);
    expect(index.options.partialFilterExpression).toEqual({ [field]: { $type: 'string' } });
  });

  test('um carrinho por cliente e códigos de vale únicos', () => {
    expect(Cart.schema.path('userId').options.unique).toBe(true);
    expect(Voucher.schema.path('code').options.unique).toBe(true);
    expect(User.schema.path('email').options.unique).toBe(true);
    expect(User.schema.path('username').options.unique).toBe(true);
    expect(Restaurant.schema.path('email').options.unique).toBe(true);
  });
});
