/**
 * Testes de segurança da API. A base de dados é substituída por mocks, por isso estes testes
 * correm sem MongoDB e verificam só as regras de autenticação e autorização.
 *
 * A sessão vai sempre num cookie e os pedidos que alteram dados levam o cabeçalho Origin
 * do cliente Angular (proteção CSRF).
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../app');
const { config } = require('../config/env');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');
const { asUser, mockQuery } = require('./support/helpers');

const app = createApp();

/** Simula o encadeamento Model.findOne(...).select(...) usado no login. */
const findOneReturning = (value) => ({ select: jest.fn().mockResolvedValue(value) });

afterEach(() => jest.restoreAllMocks());

describe('rotas protegidas', () => {
  test.each([
    ['get', '/cliente/api/restaurantes'],
    ['get', '/cliente/api/carrinho'],
    ['patch', '/user/api/orders/507f1f77bcf86cd799439011/state'],
    ['get', '/admin/validar-restaurantes'],
    ['get', '/auth/me'],
  ])('%s %s sem sessão responde 401', async (method, url) => {
    const res = await request(app)[method](url).set('Origin', config.clientUrl);
    expect(res.status).toBe(401);
  });

  test('um token assinado com outro segredo é ignorado', async () => {
    const forged = jwt.sign({ userId: 'x', userType: 'admin', tv: 0 }, 'outro-segredo', {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
    const res = await request(app)
      .get('/admin/validar-restaurantes')
      .set('Cookie', `${config.sessionCookieName}=${forged}`);
    expect(res.status).toBe(401);
  });

  test('um cliente não acede às rotas de administração', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    const res = await asUser(request(app).get('/admin/validar-restaurantes'), 'c1', 'customer');
    expect(res.status).toBe(403);
  });

  test('um restaurante ainda não validado não fica autenticado', async () => {
    mockQuery(Restaurant, 'findById', { _id: 'r1', isChecked: false });
    const res = await asUser(request(app).get('/restaurante/reviews'), 'r1', 'restaurant');
    expect(res.status).toBe(401);
  });
});

describe('estado das encomendas', () => {
  const url = '/user/api/orders/507f1f77bcf86cd799439011/state';

  const mockRestaurant = (id) => mockQuery(Restaurant, 'findById', { _id: id, isChecked: true });
  const mockOrder = (order) => jest.spyOn(Order, 'findById').mockResolvedValue({ save: jest.fn(), ...order });

  test('um cliente não pode alterar o estado de uma encomenda', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    const res = await asUser(request(app).patch(url), 'c1', 'customer').send({ state: 'entregue' });
    expect(res.status).toBe(403);
  });

  test('um restaurante não pode alterar encomendas de outro restaurante', async () => {
    mockRestaurant('r1');
    mockOrder({ restaurantId: 'r2', state: 'pendente' });
    const res = await asUser(request(app).patch(url), 'r1', 'restaurant').send({ state: 'em preparação' });
    expect(res.status).toBe(403);
  });

  test('não é possível saltar etapas', async () => {
    mockRestaurant('r1');
    mockOrder({ restaurantId: 'r1', state: 'pendente' });
    const res = await asUser(request(app).patch(url), 'r1', 'restaurant').send({ state: 'entregue' });
    expect(res.status).toBe(400);
  });

  test('o restaurante dono avança a encomenda', async () => {
    mockRestaurant('r1');
    const order = { restaurantId: 'r1', state: 'pendente', save: jest.fn() };
    jest.spyOn(Order, 'findById').mockResolvedValue(order);
    const res = await asUser(request(app).patch(url), 'r1', 'restaurant').send({ state: 'em preparação' });
    expect(res.status).toBe(200);
    expect(order.state).toBe('em preparação');
    expect(order.save).toHaveBeenCalled();
  });
});

describe('login', () => {
  test('rejeita operadores do MongoDB em vez de texto (injeção NoSQL)', async () => {
    const res = await request(app).post('/auth/login').send({ username: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  test('não revela se o utilizador existe', async () => {
    jest.spyOn(User, 'findOne').mockReturnValue(findOneReturning(null));
    jest.spyOn(Restaurant, 'findOne').mockReturnValue(findOneReturning(null));
    const res = await request(app).post('/auth/login').send({ username: 'ninguem', password: 'Qualquer1!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciais inválidas.');
  });
});

describe('perfil', () => {
  test('não é possível promover a conta a administrador pelo formulário de perfil', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    const update = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await asUser(request(app).put('/user/perfil/editar'), 'c1', 'customer')
      .type('form')
      .send({
        name: 'Ana Silva',
        phone: '912345678',
        birthDate: '1990-01-01',
        userType: 'admin',
        'address[street]': 'Rua Direita',
        'address[number]': '10',
        'address[zipCode]': '4000-123',
        'address[place]': 'Porto',
        'address[district]': 'Porto',
        'address[country]': 'Portugal',
      });

    expect(res.status).toBe(200);
    const fields = update.mock.calls[0][1];
    expect(fields.name).toBe('Ana Silva');
    expect(fields).not.toHaveProperty('userType');
  });
});

describe('encomendas e vales', () => {
  const asCustomer = (req) => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    return asUser(req, 'c1', 'customer');
  };

  test('pagar no local sem documento de identificação é recusado', async () => {
    jest.spyOn(Order, 'find').mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const res = await asCustomer(request(app).post('/cliente/api/carrinho/finalizar')).send({ paymentMethod: 'local' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/documento de identificação/);
  });

  test('não se compram vales com valores inventados', async () => {
    const res = await asCustomer(request(app).post('/cliente/api/vales')).send({ value: 1000 });
    expect(res.status).toBe(400);
  });

  test('um restaurante não compra vales', async () => {
    mockQuery(Restaurant, 'findById', { _id: 'r1', isChecked: true });
    const res = await asUser(request(app).post('/cliente/api/vales'), 'r1', 'restaurant').send({ value: 10 });
    expect(res.status).toBe(403);
  });
});

describe('documentação', () => {
  test('o Swagger está disponível fora de produção', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger/i);
  });
});
