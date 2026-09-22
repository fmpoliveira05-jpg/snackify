/**
 * Testes de segurança da API. A base de dados é substituída por mocks, por isso estes testes
 * correm sem MongoDB e verificam só as regras de autenticação e autorização.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../app');
const { config } = require('../config/env');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');

const app = createApp();

const tokenFor = (userId, userType) => jwt.sign({ userId, userType }, config.jwtSecret, { expiresIn: '1h' });
const bearer = (userId, userType) => ({ Authorization: `Bearer ${tokenFor(userId, userType)}` });

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
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });

  test('um token assinado com outro segredo é ignorado', async () => {
    const forged = jwt.sign({ userId: 'x', userType: 'admin' }, 'outro-segredo');
    const res = await request(app).get('/admin/validar-restaurantes').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('um cliente não acede às rotas de administração', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: 'c1' });
    const res = await request(app).get('/admin/validar-restaurantes').set(bearer('c1', 'customer'));
    expect(res.status).toBe(403);
  });

  test('um restaurante ainda não validado não fica autenticado', async () => {
    jest.spyOn(Restaurant, 'findById').mockResolvedValue({ _id: 'r1', isChecked: false });
    const res = await request(app).get('/restaurante/reviews').set(bearer('r1', 'restaurant'));
    expect(res.status).toBe(401);
  });
});

describe('estado das encomendas', () => {
  const url = '/user/api/orders/507f1f77bcf86cd799439011/state';

  const mockRestaurant = (id) => jest.spyOn(Restaurant, 'findById').mockResolvedValue({ _id: id, isChecked: true });
  const mockOrder = (order) => jest.spyOn(Order, 'findById').mockResolvedValue({ save: jest.fn(), ...order });

  test('um cliente não pode alterar o estado de uma encomenda', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: 'c1' });
    const res = await request(app).patch(url).set(bearer('c1', 'customer')).send({ state: 'entregue' });
    expect(res.status).toBe(403);
  });

  test('um restaurante não pode alterar encomendas de outro restaurante', async () => {
    mockRestaurant('r1');
    mockOrder({ restaurantId: 'r2', state: 'pendente' });
    const res = await request(app).patch(url).set(bearer('r1', 'restaurant')).send({ state: 'em preparação' });
    expect(res.status).toBe(403);
  });

  test('não é possível saltar etapas', async () => {
    mockRestaurant('r1');
    mockOrder({ restaurantId: 'r1', state: 'pendente' });
    const res = await request(app).patch(url).set(bearer('r1', 'restaurant')).send({ state: 'entregue' });
    expect(res.status).toBe(400);
  });

  test('o restaurante dono avança a encomenda', async () => {
    mockRestaurant('r1');
    const order = { restaurantId: 'r1', state: 'pendente', save: jest.fn() };
    jest.spyOn(Order, 'findById').mockResolvedValue(order);
    const res = await request(app).patch(url).set(bearer('r1', 'restaurant')).send({ state: 'em preparação' });
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
    expect(res.body.message).toBe('Username ou password incorretos.');
  });
});

describe('perfil', () => {
  test('não é possível promover a conta a administrador pelo formulário de perfil', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: 'c1' });
    const update = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(app)
      .put('/user/perfil/editar')
      .set(bearer('c1', 'customer'))
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
  const asCustomer = () => {
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: 'c1', userType: 'customer' });
    return bearer('c1', 'customer');
  };

  test('pagar no local sem documento de identificação é recusado', async () => {
    const headers = asCustomer();
    jest.spyOn(Order, 'find').mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const res = await request(app).post('/cliente/api/carrinho/finalizar').set(headers).send({ paymentMethod: 'local' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/documento de identificação/);
  });

  test('não se compram vales com valores inventados', async () => {
    const res = await request(app).post('/cliente/api/vales').set(asCustomer()).send({ value: 1000 });
    expect(res.status).toBe(400);
  });

  test('um restaurante não compra vales', async () => {
    jest.spyOn(Restaurant, 'findById').mockResolvedValue({ _id: 'r1', isChecked: true });
    const res = await request(app).post('/cliente/api/vales').set(bearer('r1', 'restaurant')).send({ value: 10 });
    expect(res.status).toBe(403);
  });
});

describe('documentação', () => {
  test('o Swagger está disponível', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger/i);
  });
});
