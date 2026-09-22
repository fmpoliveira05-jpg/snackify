const Restaurant = require('../models/restaurant');
const Dish = require('../models/dish');
const Menu = require('../models/menu');
const Order = require('../models/order');
const Cart = require('../models/cart');
const { config } = require('../config/env');
const { wrapAll } = require('../utils/asyncHandler');
const {
  CART_TIMEOUT_MINUTES,
  computeBlockedUntil,
  computeTotal,
  isCartExpired,
} = require('../services/orderRules');

// O Stripe é opcional: sem chave configurada o pagamento online fica simplesmente indisponível.
const stripe = config.stripeSecretKey ? require('stripe')(config.stripeSecretKey) : null;

/** Campos de um restaurante que um cliente pode ver (nunca a password, o NIF ou o estado interno). */
const PUBLIC_RESTAURANT_FIELDS = 'name email phone address logo foundedAt createdAt';
const VALID_DOSES = ['1/2', '1'];

const sameId = (a, b) => String(a) === String(b);

/** Carrega o carrinho do cliente, esvaziando-o se o prazo de 10 minutos já tiver passado. */
async function loadCart(userId) {
  let cart = await Cart.findOne({ userId }).populate('items.dishId');
  if (!cart) {
    cart = await Cart.create({ userId });
  }
  if (isCartExpired(cart.timeout)) {
    cart.items = [];
    cart.total = 0;
    cart.timeout = null;
    await cart.save();
  }
  return cart;
}

/** Datas dos cancelamentos recentes do cliente (os últimos 3 meses chegam para a regra dos 2 meses). */
async function recentCancellations(userId) {
  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  const cancelled = await Order.find({ userId, state: 'cancelada', orderDate: { $gte: since } }).select('orderDate');
  return cancelled.map((order) => order.orderDate);
}

const listRestaurants = async (req, res) => {
  const restaurants = await Restaurant.find({ isChecked: true }).select(PUBLIC_RESTAURANT_FIELDS);
  res.json(restaurants);
};

const readRestaurant = async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.id, isChecked: true }).select(PUBLIC_RESTAURANT_FIELDS);
  if (!restaurant) return res.status(404).json({ message: 'Restaurante não encontrado.' });
  res.json(restaurant);
};

const readMenu = async (req, res) => {
  const menu = await Menu.findById(req.params.id);
  if (!menu) return res.status(404).json({ message: 'Menu não encontrado.' });
  res.json(menu);
};

const listMenus = async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.id, isChecked: true });
  if (!restaurant) return res.status(404).json({ message: 'Restaurante não encontrado.' });

  const menus = await Menu.find({ restaurantId: restaurant._id });
  const menusWithDishes = await Promise.all(menus.map(async (menu) => ({
    ...menu.toObject(),
    dishes: await Dish.find({ menuId: menu._id }),
  })));

  res.json(menusWithDishes);
};

const listDishes = async (req, res) => {
  const menu = await Menu.findById(req.params.id);
  if (!menu) return res.status(404).json({ message: 'Menu não encontrado.' });
  res.json(await Dish.find({ menuId: menu._id }));
};

const showCustomerDashboard = async (req, res) => {
  const userId = req.user._id;

  const orders = await Order.find({ userId })
    .sort({ orderDate: -1 })
    .limit(5)
    .populate('dishes.dishId');

  const orderTotals = orders.map((order) => ({
    orderCode: order.orderCode || order._id.toString().slice(-5),
    total: computeTotal(order.dishes),
  }));

  const blockedUntil = computeBlockedUntil(await recentCancellations(userId));

  res.json({
    orderTotals,
    isBlocked: Boolean(blockedUntil),
    blockedUntil: blockedUntil ? blockedUntil.toLocaleDateString('pt-PT') : null,
  });
};

const viewCart = async (req, res) => {
  const cart = await loadCart(req.user._id);
  res.json(cart);
};

const addToCart = async (req, res) => {
  const { dishId, amount, dose } = req.body;

  const parsedAmount = Number.parseInt(amount, 10);
  if (!Number.isInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 50) {
    return res.status(400).json({ message: 'Quantidade inválida.' });
  }
  if (!VALID_DOSES.includes(dose)) {
    return res.status(400).json({ message: 'Dose inválida.' });
  }

  // O prato é validado ANTES de mexer no carrinho (antes, um id inválido rebentava o servidor).
  const dish = await Dish.findById(dishId);
  if (!dish || !dish.pricePerDose.some((p) => p.dose === dose)) {
    return res.status(404).json({ message: 'Prato ou dose não disponível.' });
  }
  const restaurant = await Restaurant.exists({ _id: dish.restaurantId, isChecked: true });
  if (!restaurant) {
    return res.status(404).json({ message: 'O restaurante deste prato não está disponível.' });
  }

  const cart = await loadCart(req.user._id);
  const otherRestaurant = cart.items.some((item) => item.dishId && !sameId(item.dishId.restaurantId, dish.restaurantId));
  if (otherRestaurant) {
    return res.status(400).json({ message: 'O carrinho só pode ter pratos de um restaurante. Esvazie-o primeiro.' });
  }

  const existing = cart.items.find((item) => item.dishId && sameId(item.dishId._id, dish._id) && item.dose === dose);
  if (existing) {
    existing.amount += parsedAmount;
  } else {
    cart.items.push({ dishId: dish._id, amount: parsedAmount, dose });
  }
  if (!cart.timeout) {
    cart.timeout = new Date(Date.now() + CART_TIMEOUT_MINUTES * 60 * 1000);
  }

  await cart.populate('items.dishId');
  cart.total = computeTotal(cart.items);
  await cart.save();
  res.json(cart);
};

const removeFromCart = async (req, res) => {
  const { dishId, dose } = req.query;
  const cart = await loadCart(req.user._id);

  const index = cart.items.findIndex((item) => item.dishId && sameId(item.dishId._id, dishId) && item.dose === dose);
  if (index === -1) {
    return res.status(404).json({ message: 'Item não encontrado no carrinho.' });
  }

  cart.items.splice(index, 1);
  cart.total = computeTotal(cart.items);
  if (cart.items.length === 0) {
    cart.timeout = null;
  }
  await cart.save();
  res.json(cart);
};

const clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], total: 0, timeout: null });
  res.json({ message: 'Carrinho limpo.' });
};

/** Devolve uma encomenda do próprio cliente (antes qualquer cliente via qualquer encomenda). */
const checkout = async (req, res) => {
  const order = await Order.findOne({ _id: req.query.orderId, userId: req.user._id }).populate('dishes.dishId');
  if (!order) return res.status(404).json({ message: 'Encomenda não encontrada.' });
  res.json(order);
};

const createOrderFromCart = async (req, res) => {
  const userId = req.user._id;

  const blockedUntil = computeBlockedUntil(await recentCancellations(userId));
  if (blockedUntil) {
    return res.status(403).json({
      message: `Cancelou 5 encomendas num mês e só pode voltar a encomendar a partir de ${blockedUntil.toLocaleDateString('pt-PT')}.`,
    });
  }

  const cart = await loadCart(userId);
  const items = cart.items.filter((item) => item.dishId);
  if (items.length === 0) {
    return res.status(400).json({ message: 'O carrinho está vazio ou expirou.' });
  }

  const restaurants = new Set(items.map((item) => String(item.dishId.restaurantId)));
  if (restaurants.size > 1) {
    return res.status(400).json({ message: 'Todos os pratos da encomenda devem ser do mesmo restaurante.' });
  }

  const order = await Order.create({
    userId,
    restaurantId: items[0].dishId.restaurantId,
    dishes: items.map((item) => ({ dishId: item.dishId._id, amount: item.amount, dose: item.dose })),
    state: 'pendente',
    orderDate: new Date(),
    cancelTimeout: new Date(Date.now() + 5 * 60 * 1000),
    orderCode: `ORD-${Date.now().toString(36).toUpperCase()}`,
    identityDoc: typeof req.body?.identityDoc === 'string' ? req.body.identityDoc.trim() : undefined,
  });

  cart.items = [];
  cart.total = 0;
  cart.timeout = null;
  await cart.save();

  res.status(201).json({
    message: 'Encomenda criada com sucesso.',
    orderId: order._id,
    orderCode: order.orderCode,
  });
};

/**
 * Cria a sessão de pagamento do Stripe a partir da encomenda guardada na base de dados.
 * Os preços enviados pelo browser são ignorados (antes, o cliente podia alterá-los).
 */
const createStripeSession = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'O pagamento online não está configurado neste servidor.' });
  }

  const order = await Order.findOne({ _id: req.body.orderId, userId: req.user._id, state: 'pendente' }).populate('dishes.dishId');
  if (!order) return res.status(404).json({ message: 'Encomenda não encontrada ou já paga.' });

  const lineItems = order.dishes
    .filter((item) => item.dishId)
    .map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: { name: `${item.dishId.name} (dose ${item.dose})` },
        unit_amount: Math.round(item.dishId.pricePerDose.find((p) => p.dose === item.dose).price * 100),
      },
      quantity: item.amount,
    }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    metadata: { orderId: String(order._id) },
    success_url: `${config.serverUrl}/cliente/api/carrinho/pagamento-sucesso?orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.clientUrl}/cliente/dashboard`,
  });

  res.json({ url: session.url });
};

/**
 * O Stripe redireciona para aqui depois do pagamento. A sessão é confirmada junto do Stripe
 * antes de marcar a encomenda como paga (antes bastava abrir este URL para "pagar").
 */
const handlePaymentSuccess = async (req, res) => {
  const { orderId, session_id: sessionId } = req.query;
  if (!stripe || !sessionId) {
    return res.status(400).json({ message: 'Pagamento não confirmado.' });
  }

  const order = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!order) return res.status(404).json({ message: 'Encomenda não encontrada.' });

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid' || session.metadata?.orderId !== String(order._id)) {
    return res.status(402).json({ message: 'O pagamento não foi concluído.' });
  }

  if (order.state === 'pendente') {
    order.state = 'concluída';
    await order.save();
  }
  res.redirect(`${config.clientUrl}/cliente/dashboard`);
};

module.exports = wrapAll({
  listRestaurants,
  readRestaurant,
  readMenu,
  listMenus,
  listDishes,
  showCustomerDashboard,
  viewCart,
  addToCart,
  removeFromCart,
  clearCart,
  checkout,
  createOrderFromCart,
  createStripeSession,
  handlePaymentSuccess,
});
