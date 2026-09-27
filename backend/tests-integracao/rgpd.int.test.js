/**
 * RGPD contra um MongoDB real: registo com aceitação da política, exportação, apagamento da
 * conta (com pseudonimização das encomendas e remoção das imagens) e prazos de conservação.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const createApp = require('../app');
const { config } = require('../config/env');
const { runRetention } = require('../services/retention');
const { UPLOAD_ROOT } = require('../middlewares/uploadMiddleware');
const { sessionCookie, ORIGIN } = require('../tests/support/helpers');
const db = require('./support/db');

const { User, Restaurant, Order, Review, Voucher, Cart, Dish, Menu } = db.models;
const app = createApp();
const PASSWORD = 'Passw0rd!Forte';

beforeAll(() => db.connect('rgpd'));
afterAll(() => db.disconnect());
afterEach(() => jest.restoreAllMocks());

const as = (req, account, type) => req.set('Cookie', sessionCookie(account._id, type)).set('Origin', ORIGIN);

/** Cria um ficheiro de imagem falso em /uploads/<pasta> e devolve o caminho público. */
const fakeUpload = (folder) => {
  const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
  fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_ROOT, folder, name), Buffer.from([0xff, 0xd8, 0xff, 0x00]));
  return `/uploads/${folder}/${name}`;
};
const exists = (publicPath) => fs.existsSync(path.join(UPLOAD_ROOT, publicPath.replace('/uploads/', '')));

test('o registo guarda a aceitação da Política de Privacidade', async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  const res = await request(app).post('/register/registar-cliente')
    .set('Origin', ORIGIN).set('Accept', 'application/json').type('form')
    .send({
      name: 'Rita Sousa', username: 'ritasousa', email: 'rita@exemplo.pt', password: PASSWORD, birthDate: '1991-02-03', phone: '912345678',
      'address[street]': 'Rua Nova', 'address[number]': '5', 'address[zipCode]': '4000-001', 'address[place]': 'Porto',
      'address[district]': 'Porto', 'address[country]': 'Portugal', acceptPrivacy: 'on',
    });
  expect(res.status).toBe(201);
  const user = await User.findOne({ username: 'ritasousa' }).lean();
  expect(user.privacyPolicyVersion).toBe(config.privacyPolicyVersion);
  expect(user.privacyAcceptedAt).toBeInstanceOf(Date);
  expect(user.emailVerified).toBe(false);
});

describe('cliente', () => {
  let customer;
  let restaurant;
  let order;
  let reviewImage;
  let profilePicture;

  beforeAll(async () => {
    profilePicture = fakeUpload('profilePictures');
    reviewImage = fakeUpload('reviews');
    customer = await db.createCustomer({ password: await bcrypt.hash(PASSWORD, 4), profilePicture });
    restaurant = await db.createRestaurant();
    const friend = await db.createCustomer();
    order = await Order.create({
      userId: customer._id, restaurantId: restaurant._id, state: 'entregue', total: 20, dishes: [], orderCode: 'ORD-RGPD-1',
      paymentMethod: 'local', identityDoc: 'CC12345678',
    });
    await Review.create({ title: 'Muito bom', description: 'Recomendo', userId: customer._id, restaurantId: restaurant._id, orderId: order._id, image: reviewImage });
    await Voucher.create({ code: 'VALE-RGPD01', buyerId: customer._id, ownerId: customer._id, value: 10, balance: 5, status: 'active', message: 'para mim' });
    await Voucher.create({ code: 'VALE-RGPD02', buyerId: customer._id, ownerId: friend._id, value: 20, balance: 20, status: 'active', message: 'parabéns' });
    await Cart.create({ userId: customer._id, items: [] });
  });

  test('a exportação inclui a conta, as encomendas, as avaliações e os vales, sem segredos', async () => {
    const res = await as(request(app).get('/user/perfil/exportar'), customer, 'customer');
    expect(res.status).toBe(200);
    const data = JSON.parse(res.text);
    expect(data.conta.email).toBe(customer.email);
    expect(data.encomendas).toHaveLength(1);
    expect(data.encomendas[0].identityDoc).toBe('CC12345678');
    expect(data.avaliacoes).toHaveLength(1);
    expect(data.vales.map((v) => v.code).sort()).toEqual(['VALE-RGPD01', 'VALE-RGPD02']);
    expect(res.text).not.toMatch(/"password"|TokenHash|failedLoginAttempts|tokenVersion|\$2[aby]\$/);
  });

  test('com uma encomenda em curso a conta não é apagada', async () => {
    const active = await Order.create({ userId: customer._id, restaurantId: restaurant._id, state: 'em preparação', total: 5, dishes: [] });
    const res = await as(request(app).post('/user/perfil/eliminar'), customer, 'customer').send({ password: PASSWORD });
    expect(res.status).toBe(409);
    await Order.deleteOne({ _id: active._id });
  });

  test('apagar a conta remove os dados pessoais e pseudonimiza as encomendas', async () => {
    const res = await as(request(app).post('/user/perfil/eliminar'), customer, 'customer').send({ password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/token=;/);

    expect(await User.exists({ _id: customer._id })).toBeNull();
    expect(await Review.countDocuments({ userId: customer._id })).toBe(0);
    expect(await Cart.countDocuments({ userId: customer._id })).toBe(0);
    expect(exists(profilePicture)).toBe(false);
    expect(exists(reviewImage)).toBe(false);

    const kept = await Order.findById(order._id).lean();
    expect(kept.orderCode).toBe('ORD-RGPD-1');
    expect(kept.total).toBe(20);
    expect(kept.userId).toBeUndefined();
    expect(kept.identityDoc).toBeUndefined();
    expect(kept.customerDeleted).toBe(true);

    const own = await Voucher.findOne({ code: 'VALE-RGPD01' }).lean();
    expect(own.status).toBe('cancelled');
    expect(own.ownerId).toBeUndefined();
    expect(own.message).toBeUndefined();
    const gift = await Voucher.findOne({ code: 'VALE-RGPD02' }).lean();
    expect(gift.status).toBe('active');
    expect(gift.buyerId).toBeUndefined();
    expect(gift.ownerId).toBeDefined();

    // A sessão antiga deixa de servir (a conta já não existe).
    const me = await as(request(app).get('/auth/me'), customer, 'customer');
    expect(me.status).toBe(401);
  });
});

test('apagar um restaurante remove menus, pratos, imagens e avaliações e mantém as encomendas', async () => {
  const logo = fakeUpload('logos');
  const dishImage = fakeUpload('dishes');
  const restaurant = await db.createRestaurant({ password: await bcrypt.hash(PASSWORD, 4), logo });
  const category = await db.createCategory();
  const menu = await Menu.create({ restaurantId: restaurant._id, title: 'Almoço' });
  await db.createDish(restaurant, category, { menuId: menu._id, image: dishImage });
  const customer = await db.createCustomer();
  const order = await Order.create({ userId: customer._id, restaurantId: restaurant._id, state: 'entregue', total: 9, dishes: [] });
  await Review.create({ title: 'Ok', description: 'Ok', userId: customer._id, restaurantId: restaurant._id, orderId: order._id });

  const res = await as(request(app).post('/user/perfil/eliminar'), restaurant, 'restaurant').send({ password: PASSWORD });

  expect(res.status).toBe(200);
  expect(await Restaurant.exists({ _id: restaurant._id })).toBeNull();
  expect(await Menu.countDocuments({ restaurantId: restaurant._id })).toBe(0);
  expect(await Dish.countDocuments({ restaurantId: restaurant._id })).toBe(0);
  expect(await Review.countDocuments({ restaurantId: restaurant._id })).toBe(0);
  expect(exists(logo)).toBe(false);
  expect(exists(dishImage)).toBe(false);
  expect(await Order.exists({ _id: order._id })).not.toBeNull();
});

describe('prazos de conservação', () => {
  test('a limpeza apaga contas por confirmar antigas, tokens expirados, documentos e vales por pagar', async () => {
    const DAY = 24 * 60 * 60 * 1000;
    const old = new Date(Date.now() - 10 * DAY);
    const picture = fakeUpload('profilePictures');
    const stale = await db.createCustomer({ emailVerified: false, createdAt: old, profilePicture: picture });
    const fresh = await db.createCustomer({ emailVerified: false });
    const staleRestaurant = await db.createRestaurant({ emailVerified: false, createdAt: old, isChecked: false });
    const withToken = await db.createCustomer({ passwordResetTokenHash: 'c'.repeat(64), passwordResetExpires: new Date(Date.now() - 1000) });
    const restaurant = await db.createRestaurant();
    const finished = await Order.create({
      userId: withToken._id, restaurantId: restaurant._id, state: 'entregue', orderDate: new Date(Date.now() - 40 * DAY), identityDoc: 'CC99999999', total: 1, dishes: [],
    });
    const recent = await Order.create({
      userId: withToken._id, restaurantId: restaurant._id, state: 'entregue', orderDate: new Date(), identityDoc: 'CC88888888', total: 1, dishes: [],
    });
    await Voucher.create({ code: 'VALE-PEND01', buyerId: withToken._id, ownerId: withToken._id, value: 5, balance: 0, status: 'pending', createdAt: old });

    const result = await runRetention();

    expect(result.contasPorConfirmar).toBeGreaterThanOrEqual(2);
    expect(await User.exists({ _id: stale._id })).toBeNull();
    expect(await Restaurant.exists({ _id: staleRestaurant._id })).toBeNull();
    expect(await User.exists({ _id: fresh._id })).not.toBeNull();
    expect(exists(picture)).toBe(false);
    const tokenUser = await User.findById(withToken._id).select('+passwordResetTokenHash').lean();
    expect(tokenUser.passwordResetTokenHash).toBeUndefined();
    expect((await Order.findById(finished._id).lean()).identityDoc).toBeUndefined();
    expect((await Order.findById(recent._id).lean()).identityDoc).toBe('CC88888888');
    expect(await Voucher.exists({ code: 'VALE-PEND01' })).toBeNull();
  });

  test('existe o índice TTL que apaga contas por confirmar (rede de segurança)', async () => {
    for (const Model of [User, Restaurant]) {
      const ttl = (await Model.collection.indexes()).find((i) => i.name === 'contas_por_confirmar_ttl');
      expect(ttl.expireAfterSeconds).toBe(8 * 24 * 60 * 60);
      expect(ttl.partialFilterExpression).toEqual({ emailVerified: false });
    }
  });
});
