// Operadores construídos pelo servidor são marcados como confiáveis; o sanitizeFilter só neutraliza os que vêm do pedido.
const { trusted } = require('mongoose');
const Restaurant = require('../models/restaurant');
const Dish = require('../models/dish');
const Menu = require('../models/menu');
const Order = require('../models/order');
const Cart = require('../models/cart');
const Category = require('../models/category');
const User = require('../models/user');
const Voucher = require('../models/voucher');
const { config } = require('../config/env');
const { wrapAll } = require('../utils/asyncHandler');
const {
  CART_TIMEOUT_MINUTES,
  computeBlockedUntil,
  computeTotal,
  isCartExpired,
} = require('../services/orderRules');
const {
  ACTIVE_STATES,
  checkOrderAllowed,
  estimateTimes,
  validateCheckoutChoices,
} = require('../services/restaurantRules');
const { filterRestaurants, filterDishes } = require('../services/search');
const { VOUCHER_VALUES, generateVoucherCode, applyVoucher } = require('../services/vouchers');

const payments = require('../services/payments');
const { catalogCache, KEYS } = require('../services/catalogCache');
const { withDishes } = require('../services/menus');
const { parsePagination, paginateArray, setPaginationHeaders } = require('../utils/pagination');

/** Campos de um restaurante que um cliente pode ver (nunca a password, o NIF ou o estado interno). */
const PUBLIC_RESTAURANT_FIELDS = 'name email phone address logo foundedAt createdAt settings';
const VALID_DOSES = ['1/2', '1'];

/**
 * Compara dois ids do MongoDB (ObjectId ou texto).
 */
const sameId = (a, b) => String(a) === String(b);

/** Carrega o carrinho do cliente, esvaziando-o se o prazo de 10 minutos já tiver passado. */
async function loadCart(userId) {
  let cart = await Cart.findOne({ userId }).populate('items.dishId');
  if (!cart) {
    try {
      cart = await Cart.create({ userId });
    } catch (err) {
      // Dois pedidos simultâneos tentaram criar o carrinho: o índice único deixa passar só um.
      if (err?.code !== 11000) throw err;
      cart = await Cart.findOne({ userId }).populate('items.dishId');
    }
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
  const cancelled = await Order.find({ userId, state: 'cancelada', orderDate: trusted({ $gte: since }) })
    .select('orderDate')
    .lean();
  return cancelled.map((order) => order.orderDate);
}

/** Só se aceitam parâmetros de pesquisa em texto (um objeto ou uma lista são ignorados). */
const textParams = (query, names) => Object.fromEntries(
  names.map((name) => [name, typeof query[name] === 'string' ? query[name] : undefined]),
);

/**
 * GET /cliente/api/restaurantes — restaurantes validados, com pesquisa por nome (`q`),
 * localidade ou distrito (`location`) e ordenação (`sort`: nome | recentes).
 */
const listRestaurants = async (req, res) => {
  const restaurants = await catalogCache.wrap(KEYS.restaurants, () => Restaurant.find({ isChecked: true })
    .select(PUBLIC_RESTAURANT_FIELDS)
    .lean()
    .maxTimeMS(config.timeouts.query));
  const filtered = filterRestaurants(restaurants, textParams(req.query, ['q', 'location', 'sort']));
  res.json(paginateArray(res, filtered, parsePagination(req.query)));
};

/** Pratos de todos os restaurantes validados, com o restaurante e a categoria (em cache). */
const loadCatalogDishes = () => catalogCache.wrap(KEYS.dishes, async () => {
  const restaurantIds = await Restaurant.find({ isChecked: true }).distinct('_id');
  return Dish.find({ restaurantId: trusted({ $in: restaurantIds }) })
    .select('name description category image nutriInfo pricePerDose restaurantId menuId')
    .populate('restaurantId', 'name address')
    .populate('category', 'name')
    .lean()
    .maxTimeMS(config.timeouts.query);
});

/**
 * GET /cliente/api/pratos — pesquisa de pratos em todos os restaurantes validados.
 * Filtros: q, category, restaurant, location, minPrice, maxPrice; ordenação: sort
 * (nome | preco-asc | preco-desc).
 */
const searchDishes = async (req, res) => {
  const dishes = await loadCatalogDishes();
  const query = textParams(req.query, ['q', 'category', 'restaurant', 'location', 'minPrice', 'maxPrice', 'sort']);
  res.json(paginateArray(res, filterDishes(dishes, query), parsePagination(req.query)));
};

/** GET /cliente/api/categorias — categorias de pratos, para os filtros de pesquisa. */
const listCategories = async (req, res) => {
  res.json(await catalogCache.wrap(KEYS.categories, () => Category.find().sort({ name: 1 }).lean()));
};

/**
 * GET /cliente/api/restaurantes/:id — dados públicos de um restaurante validado.
 */
const readRestaurant = async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.id, isChecked: true }).select(PUBLIC_RESTAURANT_FIELDS).lean();
  if (!restaurant) return res.status(404).json({ message: 'Restaurante não encontrado.' });
  res.json(restaurant);
};

/**
 * GET /cliente/api/menus/:id — um menu.
 */
const readMenu = async (req, res) => {
  const menu = await Menu.findById(req.params.id).lean();
  if (!menu) return res.status(404).json({ message: 'Menu não encontrado.' });
  res.json(menu);
};

/**
 * GET /cliente/api/restaurantes/:id/menus — menus de um restaurante validado, cada um com os seus pratos.
 */
const listMenus = async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.id, isChecked: true }).select('_id').lean();
  if (!restaurant) return res.status(404).json({ message: 'Restaurante não encontrado.' });

  const menusWithDishes = await catalogCache.wrap(KEYS.menus(restaurant._id), async () => {
    const menus = await Menu.find({ restaurantId: restaurant._id }).lean();
    return withDishes(menus);
  });
  res.json(menusWithDishes);
};



/**
 * GET /cliente/api/menus/:id/pratos — pratos de um menu, com a categoria.
 */
const listDishes = async (req, res) => {
  const menu = await Menu.findById(req.params.id).select('_id').lean();
  if (!menu) return res.status(404).json({ message: 'Menu não encontrado.' });
  res.json(await Dish.find({ menuId: menu._id }).populate('category', 'name').lean());
};

/**
 * GET /cliente/api/dashboard — totais das últimas 5 encomendas (para o gráfico) e estado de bloqueio do cliente.
 */
const showCustomerDashboard = async (req, res) => {
  const userId = req.user._id;

  const orders = await Order.find({ userId })
    .select('orderCode total dishes')
    .sort({ orderDate: -1 })
    .limit(5)
    .populate('dishes.dishId', 'pricePerDose')
    .lean();

  const orderTotals = orders.map((order) => ({
    orderCode: order.orderCode || order._id.toString().slice(-5),
    total: order.total || computeTotal(order.dishes),
  }));

  const blockedUntil = computeBlockedUntil(await recentCancellations(userId));

  res.json({
    orderTotals,
    isBlocked: Boolean(blockedUntil),
    blockedUntil: blockedUntil ? blockedUntil.toLocaleDateString('pt-PT') : null,
  });
};

/**
 * GET /cliente/api/carrinho — carrinho do cliente (vazio se os 10 minutos já passaram).
 */
const viewCart = async (req, res) => {
  const cart = await loadCart(req.user._id);
  res.json(cart);
};

/**
 * POST /cliente/api/carrinho/adicionar — junta um prato ao carrinho. Só aceita pratos de um restaurante de cada vez e inicia o prazo de 10 minutos.
 */
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

/**
 * DELETE /cliente/api/carrinho/remover — retira um prato (numa dose) do carrinho.
 */
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

/**
 * DELETE /cliente/api/carrinho/limpar — esvazia o carrinho (usado também quando o prazo termina).
 */
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

/**
 * POST /cliente/api/carrinho/finalizar — transforma o carrinho numa encomenda.
 *
 * Corpo (opcional): `fulfilment` (entrega | levantamento | no local), `paymentMethod`
 * (online | local), `identityDoc` (obrigatório se o pagamento for no local) e `voucherCode`.
 * Aplica as regras do restaurante: limite de encomendas em curso e raio máximo de entrega.
 */
const createOrderFromCart = async (req, res) => {
  const userId = req.user._id;

  const blockedUntil = computeBlockedUntil(await recentCancellations(userId));
  if (blockedUntil) {
    return res.status(403).json({
      message: `Cancelou 5 encomendas num mês e só pode voltar a encomendar a partir de ${blockedUntil.toLocaleDateString('pt-PT')}.`,
    });
  }

  const choices = validateCheckoutChoices(req.body);
  if (!choices.ok) {
    return res.status(400).json({ message: choices.message });
  }
  const { fulfilment, paymentMethod, identityDoc } = choices.value;

  const cart = await loadCart(userId);
  const items = cart.items.filter((item) => item.dishId);
  if (items.length === 0) {
    return res.status(400).json({ message: 'O carrinho está vazio ou expirou.' });
  }

  const restaurants = new Set(items.map((item) => String(item.dishId.restaurantId)));
  if (restaurants.size > 1) {
    return res.status(400).json({ message: 'Todos os pratos da encomenda devem ser do mesmo restaurante.' });
  }

  const restaurant = await Restaurant.findOne({ _id: items[0].dishId.restaurantId, isChecked: true });
  if (!restaurant) {
    return res.status(404).json({ message: 'O restaurante deixou de estar disponível.' });
  }
  const activeOrders = await Order.countDocuments({ restaurantId: restaurant._id, state: trusted({ $in: ACTIVE_STATES }) });
  const customer = await User.findById(userId).select('address');
  const decision = checkOrderAllowed({
    settings: restaurant.settings,
    activeOrders,
    fulfilment,
    restaurantCoords: restaurant.address?.coordinates,
    customerCoords: customer?.address?.coordinates,
  });
  if (!decision.allowed) {
    return res.status(409).json({ message: decision.reason });
  }

  const total = computeTotal(items);
  let discount = 0;
  let voucher = null;
  if (typeof req.body?.voucherCode === 'string' && req.body.voucherCode.trim()) {
    // Só vales ativos (pagos) contam: um vale pendente ainda não tem saldo utilizável.
    voucher = await Voucher.findOne({
      code: req.body.voucherCode.trim().toUpperCase(),
      ownerId: userId,
      status: 'active',
      balance: trusted({ $gt: 0 }),
    });
    if (!voucher) {
      return res.status(400).json({ message: 'Vale inválido, sem saldo ou de outro utilizador.' });
    }
    const applied = applyVoucher(voucher.balance, total);
    discount = applied.discount;
    voucher.balance = applied.remainingBalance;
  }

  const now = new Date();
  const { readyAt, deliveredAt } = estimateTimes(restaurant.settings, fulfilment, now);
  const order = await Order.create({
    userId,
    restaurantId: restaurant._id,
    dishes: items.map((item) => ({ dishId: item.dishId._id, amount: item.amount, dose: item.dose })),
    // Se o vale pagar tudo, a encomenda fica logo paga.
    state: discount > 0 && discount >= total ? 'concluída' : 'pendente',
    orderDate: now,
    cancelTimeout: new Date(now.getTime() + 5 * 60 * 1000),
    orderCode: `ORD-${Date.now().toString(36).toUpperCase()}`,
    identityDoc,
    fulfilment,
    paymentMethod,
    total,
    discount,
    voucherCode: voucher?.code,
    estimatedReadyAt: readyAt,
    estimatedDeliveryAt: deliveredAt,
  });
  if (voucher) await voucher.save();

  cart.items = [];
  cart.total = 0;
  cart.timeout = null;
  await cart.save();

  res.status(201).json({
    message: 'Encomenda criada com sucesso.',
    orderId: order._id,
    orderCode: order.orderCode,
    estimatedReadyAt: readyAt,
    estimatedDeliveryAt: deliveredAt,
    toPay: Math.round((total - discount) * 100) / 100,
  });
};

/**
 * GET /cliente/api/vales — vales ativos do cliente (recebidos ou comprados para si) e os
 * vales que comprou e ainda aguardam a confirmação do pagamento.
 */
const listVouchers = async (req, res) => {
  const filter = {
    $or: [
      { ownerId: req.user._id, status: 'active' },
      { buyerId: req.user._id, status: 'pending' },
    ],
  };
  const pagination = parsePagination(req.query);
  const [vouchers, total] = await Promise.all([
    Voucher.find(filter)
      .select('-idempotencyKey')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('buyerId', 'name username')
      .lean()
      .maxTimeMS(config.timeouts.query),
    Voucher.countDocuments(filter),
  ]);
  setPaginationHeaders(res, { total, ...pagination });
  res.json({ values: VOUCHER_VALUES, vouchers });
};

/**
 * POST /cliente/api/vales — compra de um vale de refeição com o Stripe Checkout.
 * Corpo: `value` (um de VOUCHER_VALUES), `giftTo` (username de outro cliente, opcional) e
 * `message` (opcional, até 140 caracteres).
 *
 * O vale é criado como pendente, sem saldo, e só é ativado quando o Stripe confirma o
 * pagamento (regresso ao success_url ou webhook). A compra simulada (vale ativo de imediato)
 * só existe fora de produção e com ALLOW_SIMULATED_PAYMENTS=true.
 */
const buyVoucher = async (req, res) => {
  const value = Number(req.body?.value);
  if (!VOUCHER_VALUES.includes(value)) {
    return res.status(400).json({ message: `O valor do vale tem de ser um destes: ${VOUCHER_VALUES.join(', ')} €.` });
  }

  let ownerId = req.user._id;
  const giftTo = typeof req.body?.giftTo === 'string' ? req.body.giftTo.trim() : '';
  if (giftTo) {
    const recipient = await User.findOne({ username: giftTo, userType: 'customer' }).select('_id');
    if (!recipient) {
      return res.status(404).json({ message: 'Não existe nenhum cliente com esse nome de utilizador.' });
    }
    ownerId = recipient._id;
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 140) : undefined;
  const base = { code: generateVoucherCode(), buyerId: req.user._id, ownerId, value, message };

  if (config.allowSimulatedPayments) {
    const voucher = await Voucher.create({ ...base, balance: value, status: 'active', paymentMethod: 'simulado', paidAt: new Date() });
    return res.status(201).json({
      message: giftTo ? `Vale oferecido a ${giftTo} (pagamento simulado).` : 'Vale comprado (pagamento simulado).',
      code: voucher.code,
      simulated: true,
    });
  }

  const stripe = payments.getStripe();
  if (!stripe) {
    return res.status(503).json({ message: 'O pagamento online não está configurado neste servidor.' });
  }

  const voucher = await Voucher.create({ ...base, balance: 0, status: 'pending' });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Vale de refeição Snackify (${value} €)` },
          unit_amount: Math.round(value * 100),
        },
        quantity: 1,
      }],
      client_reference_id: String(voucher._id),
      metadata: { type: 'voucher', voucherId: String(voucher._id), userId: String(req.user._id) },
      success_url: `${config.serverUrl}/cliente/api/vales/pagamento-sucesso?voucherId=${voucher._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.clientUrl}/cliente/vales?pagamento=cancelado`,
    });
    await Voucher.updateOne({ _id: voucher._id }, { $set: { stripeSessionId: session.id, paymentMethod: 'stripe' } });
    return res.status(201).json({ message: 'Vale reservado. Conclua o pagamento para o ativar.', url: session.url });
  } catch (err) {
    await Voucher.deleteOne({ _id: voucher._id, status: 'pending' });
    throw err;
  }
};

/**
 * GET /cliente/api/vales/pagamento-sucesso — regresso do Stripe depois de pagar um vale.
 *
 * Não exige sessão: o cookie é SameSite=Strict e não vem num regresso a partir do Stripe.
 * A segurança está na confirmação junto do Stripe (sessão paga, do vale indicado e do
 * montante certo); a ativação é idempotente, por isso o webhook pode chegar antes ou depois.
 */
const handleVoucherPaymentSuccess = async (req, res) => {
  const { voucherId, session_id: sessionId } = req.query;
  const stripe = payments.getStripe();
  if (!stripe || typeof sessionId !== 'string' || typeof voucherId !== 'string') {
    return res.redirect(303, `${config.clientUrl}/cliente/vales?pagamento=falhou`);
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const confirmed = await payments.confirmVoucherPayment(session, voucherId);
  return res.redirect(303, `${config.clientUrl}/cliente/vales?pagamento=${confirmed ? 'sucesso' : 'falhou'}`);
};

/**
 * Cria a sessão de pagamento do Stripe a partir da encomenda guardada na base de dados.
 * Os preços enviados pelo browser são ignorados (antes, o cliente podia alterá-los).
 */
const createStripeSession = async (req, res) => {
  const stripe = payments.getStripe();
  if (!stripe) {
    return res.status(503).json({ message: 'O pagamento online não está configurado neste servidor.' });
  }

  const order = await Order.findOne({ _id: req.body.orderId, userId: req.user._id, state: 'pendente' }).populate('dishes.dishId');
  if (!order) return res.status(404).json({ message: 'Encomenda não encontrada ou já paga.' });

  if (order.paymentMethod === 'local') {
    return res.status(400).json({ message: 'Esta encomenda é paga no local, com o código e o documento de identificação.' });
  }

  // Com vale, o Stripe cobra só o que falta pagar, numa única linha.
  const toPay = Math.round(((order.total || computeTotal(order.dishes)) - (order.discount || 0)) * 100);
  const lineItems = order.discount > 0
    ? [{
      price_data: {
        currency: 'eur',
        product_data: { name: `Encomenda ${order.orderCode} (com vale de ${order.discount.toFixed(2)} €)` },
        unit_amount: toPay,
      },
      quantity: 1,
    }]
    : order.dishes
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
    client_reference_id: String(order._id),
    metadata: { type: 'order', orderId: String(order._id), userId: String(req.user._id) },
    success_url: `${config.serverUrl}/cliente/api/carrinho/pagamento-sucesso?orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.clientUrl}/cliente/dashboard`,
  });

  res.json({ url: session.url });
};

/**
 * O Stripe redireciona para aqui depois do pagamento. A sessão é confirmada junto do Stripe
 * antes de marcar a encomenda como paga (abrir este URL sem pagar não tem efeito).
 *
 * Não exige sessão: o cookie é SameSite=Strict e não é enviado num regresso a partir do
 * Stripe. A sessão de pagamento tem de estar paga e pertencer a esta encomenda (e ao seu cliente).
 */
const handlePaymentSuccess = async (req, res) => {
  const { orderId, session_id: sessionId } = req.query;
  const stripe = payments.getStripe();
  if (!stripe || typeof sessionId !== 'string' || typeof orderId !== 'string') {
    return res.status(400).json({ message: 'Pagamento não confirmado.' });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!(await payments.confirmOrderPayment(session, orderId))) {
    return res.status(402).json({ message: 'O pagamento não foi concluído.' });
  }
  return res.redirect(303, `${config.clientUrl}/cliente/dashboard`);
};

module.exports = wrapAll({
  listRestaurants,
  searchDishes,
  listCategories,
  listVouchers,
  buyVoucher,
  handleVoucherPaymentSuccess,
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
