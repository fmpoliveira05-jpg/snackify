/**
 * Plano de execução (explain) das consultas principais num MongoDB real: todas têm de usar um
 * índice (IXSCAN) e nenhuma pode percorrer a coleção inteira (COLLSCAN).
 * Os planos vencedores são escritos na consola (npm run test:integracao -- --verbose).
 *
 * Os índices únicos parciais (stripeSessionId, paymentIntentId, orderCode, idempotencyKey)
 * servem para garantir unicidade; a aplicação não pesquisa por esses campos sozinhos (a chave de
 * idempotência é procurada com o userId, que tem o seu próprio índice).
 */
const mongoose = require('mongoose');
const db = require('./support/db');

const { Order, Voucher, Dish, Menu, Review, Restaurant, User, Cart } = db.models;

beforeAll(async () => {
  await db.connect('indices');
  const restaurant = await db.createRestaurant();
  const customer = await db.createCustomer();
  const category = await db.createCategory();
  const menu = await Menu.create({ restaurantId: restaurant._id, title: 'Menu' });
  await db.createDish(restaurant, category, { menuId: menu._id });
  await Order.create({ userId: customer._id, restaurantId: restaurant._id, state: 'pendente', total: 1, dishes: [] });
});
afterAll(() => db.disconnect());

/** Etapas do plano vencedor, da raiz às folhas (ex.: "LIMIT > FETCH > IXSCAN"). */
const stages = (plan) => {
  const out = [];
  let node = plan;
  while (node) {
    out.push(node.stage + (node.indexName ? `(${node.indexName})` : ''));
    node = node.inputStage || node.inputStages?.[0];
  }
  return out;
};

const id = () => new mongoose.Types.ObjectId();
const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

const QUERIES = [
  ['histórico do cliente', () => Order.find({ userId: id() }).sort({ orderDate: -1 }).limit(20)],
  ['cancelamentos recentes', () => Order.find({ userId: id(), state: 'cancelada', orderDate: mongoose.trusted({ $gte: since }) })],
  ['histórico do restaurante', () => Order.find({ restaurantId: id() }).sort({ orderDate: -1 }).limit(20)],
  ['encomendas em curso do restaurante', () => Order.find({ restaurantId: id(), state: mongoose.trusted({ $in: ['pendente', 'concluída'] }) })],
  ['idempotência da encomenda', () => Order.findOne({ userId: id(), idempotencyKey: 'chave-exemplo-01' })],
  ['vales do cliente', () => Voucher.find({ ownerId: id(), status: 'active' }).sort({ createdAt: -1 })],
  ['vale por código', () => Voucher.findOne({ code: 'VALE-XXXXXX' })],
  ['pratos de um menu', () => Dish.find({ menuId: id() })],
  ['pratos de um restaurante', () => Dish.find({ restaurantId: id() })],
  ['pratos sem menu do restaurante', () => Dish.find({ restaurantId: id(), menuId: null })],
  ['menus do restaurante', () => Menu.find({ restaurantId: id() }).sort({ createdAt: -1 })],
  ['avaliações do restaurante', () => Review.find({ restaurantId: id() }).sort({ createdAt: -1 }).limit(100)],
  ['restaurantes validados', () => Restaurant.find({ isChecked: true }).sort({ name: 1 })],
  ['login por username', () => User.findOne({ username: 'alguem' })],
  ['recuperação por email', () => Restaurant.findOne({ email: 'x@exemplo.pt' })],
  ['carrinho do cliente', () => Cart.findOne({ userId: id() })],
];

test.each(QUERIES)('%s usa um índice', async (name, build) => {
  const explain = await build().explain('queryPlanner');
  const plan = explain.queryPlanner?.winningPlan?.queryPlan || explain.queryPlanner?.winningPlan;
  const chain = stages(plan);
  console.log(`[explain] ${name}: ${chain.join(' > ')}`);
  expect(chain.join(' ')).toMatch(/IXSCAN|IDHACK|EXPRESS_IXSCAN/);
  expect(chain).not.toContain('COLLSCAN');
});
