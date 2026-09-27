/**
 * Direitos dos titulares dos dados (RGPD): acesso/portabilidade (art. 15.º e 20.º) e
 * apagamento (art. 17.º).
 *
 * Apagar a conta:
 *  - Cliente: a conta, o carrinho, as avaliações (e fotografias) e a fotografia de perfil são
 *    apagados. As encomendas ficam, pseudonimizadas (sem ligação ao cliente e sem o documento de
 *    identificação), porque são documentos de venda que o restaurante tem de conservar
 *    (obrigação legal). Os vales do cliente são cancelados e perdem a ligação à conta; um vale
 *    oferecido a outra pessoa continua válido para ela.
 *  - Restaurante: a conta, os menus, os pratos (e imagens), o logótipo e as avaliações recebidas
 *    são apagados. As encomendas recebidas ficam no histórico dos clientes (obrigação legal).
 *  - Com encomendas em curso não é possível apagar a conta (têm de terminar primeiro).
 *  - Contas de administrador não são apagadas por aqui.
 */
const { trusted } = require('mongoose');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');
const Review = require('../models/review');
const Voucher = require('../models/voucher');
const Cart = require('../models/cart');
const Menu = require('../models/menu');
const Dish = require('../models/dish');
const { stripSensitive } = require('../models/accountSecurity');
const { ACTIVE_STATES } = require('./restaurantRules');
const { removeUploads } = require('../utils/uploadFiles');
const { invalidateCatalog } = require('./catalogCache');
const { config } = require('../config/env');

const INTERNAL_ORDER_FIELDS = '-idempotencyKey -slotPending -__v';

/**
 * Todos os dados pessoais associados à conta, num objeto pronto a converter em JSON.
 *
 * @param {{_id: *, userType: string}} account
 */
async function exportAccountData(account) {
  const isRestaurant = account.userType === 'restaurant';
  const Model = isRestaurant ? Restaurant : User;
  const profile = stripSensitive(await Model.findById(account._id).lean());

  const data = {
    geradoEm: new Date().toISOString(),
    formato: 'Snackify – exportação de dados pessoais (RGPD, art. 15.º e 20.º)',
    versaoPoliticaPrivacidade: config.privacyPolicyVersion,
    conta: { ...profile, tipo: account.userType },
  };

  if (isRestaurant) {
    const [menus, dishes, orders, reviews] = await Promise.all([
      Menu.find({ restaurantId: account._id }).lean(),
      Dish.find({ restaurantId: account._id }).lean(),
      // Encomendas recebidas, sem os dados pessoais dos clientes (são dados de terceiros).
      Order.find({ restaurantId: account._id })
        .select('orderCode orderDate state fulfilment paymentMethod total discount dishes estimatedReadyAt paidAt')
        .sort({ orderDate: -1 })
        .lean(),
      Review.find({ restaurantId: account._id }).select('title description image createdAt orderId').lean(),
    ]);
    return { ...data, menus, pratos: dishes, encomendasRecebidas: orders, avaliacoesRecebidas: reviews };
  }

  const [orders, reviews, vouchers, cart] = await Promise.all([
    Order.find({ userId: account._id })
      .select(INTERNAL_ORDER_FIELDS)
      .populate('restaurantId', 'name')
      .populate('dishes.dishId', 'name')
      .sort({ orderDate: -1 })
      .lean(),
    Review.find({ userId: account._id }).lean(),
    Voucher.find({ $or: [{ buyerId: account._id }, { ownerId: account._id }] }).select('-idempotencyKey -__v').lean(),
    Cart.findOne({ userId: account._id }).select('-checkoutLockedAt -__v').lean(),
  ]);
  return { ...data, encomendas: orders, avaliacoes: reviews, vales: vouchers, carrinho: cart };
}

/** Há encomendas deste cliente ou restaurante que ainda não terminaram? */
const hasActiveOrders = (filter) => Order.exists({ ...filter, state: trusted({ $in: ACTIVE_STATES }) });

/**
 * Apaga (ou pseudonimiza, quando a lei obriga a conservar) os dados da conta.
 *
 * @param {{_id: *, userType: string}} account
 * @returns {Promise<{ok: boolean, status?: number, message?: string, summary?: object}>}
 */
async function deleteAccountData(account) {
  if (account.userType === 'admin') {
    return { ok: false, status: 403, message: 'As contas de administrador não podem ser apagadas nesta página.' };
  }
  const isRestaurant = account.userType === 'restaurant';
  const ownerFilter = isRestaurant ? { restaurantId: account._id } : { userId: account._id };
  if (await hasActiveOrders(ownerFilter)) {
    return { ok: false, status: 409, message: 'Tem encomendas em curso. Pode apagar a conta depois de terminarem.' };
  }

  if (isRestaurant) {
    const restaurant = await Restaurant.findById(account._id).select('logo').lean();
    const [dishes, reviews] = await Promise.all([
      Dish.find({ restaurantId: account._id }).select('image').lean(),
      Review.find({ restaurantId: account._id }).select('image').lean(),
    ]);
    await Promise.all([
      Dish.deleteMany({ restaurantId: account._id }),
      Menu.deleteMany({ restaurantId: account._id }),
      Review.deleteMany({ restaurantId: account._id }),
    ]);
    const files = await removeUploads([restaurant?.logo, ...dishes.map((d) => d.image), ...reviews.map((r) => r.image)]);
    await Restaurant.deleteOne({ _id: account._id });
    invalidateCatalog();
    return { ok: true, summary: { pratos: dishes.length, avaliacoes: reviews.length, ficheiros: files } };
  }

  const user = await User.findById(account._id).select('profilePicture').lean();
  const reviews = await Review.find({ userId: account._id }).select('image').lean();
  const [orders, ownVouchers, giftedVouchers] = await Promise.all([
    // Pseudonimização: a encomenda deixa de apontar para a pessoa e perde o documento de identificação.
    Order.updateMany(
      { userId: account._id },
      { $unset: { userId: 1, identityDoc: 1, idempotencyKey: 1 }, $set: { customerDeleted: true } },
    ),
    Voucher.updateMany(
      { ownerId: account._id },
      { $unset: { ownerId: 1, buyerId: 1, message: 1, idempotencyKey: 1 }, $set: { status: 'cancelled' } },
    ),
    Voucher.updateMany({ buyerId: account._id }, { $unset: { buyerId: 1, idempotencyKey: 1 } }),
  ]);
  await Promise.all([
    Review.deleteMany({ userId: account._id }),
    Cart.deleteMany({ userId: account._id }),
  ]);
  const files = await removeUploads([user?.profilePicture, ...reviews.map((r) => r.image)]);
  await User.deleteOne({ _id: account._id });
  return {
    ok: true,
    summary: {
      encomendasPseudonimizadas: orders.modifiedCount,
      valesCancelados: ownVouchers.modifiedCount,
      valesOferecidos: giftedVouchers.modifiedCount,
      avaliacoes: reviews.length,
      ficheiros: files,
    },
  };
}

module.exports = { exportAccountData, deleteAccountData };
