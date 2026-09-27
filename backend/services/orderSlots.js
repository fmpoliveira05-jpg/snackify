/**
 * Limite de encomendas em curso por restaurante, garantido de forma atómica.
 *
 * Contar as encomendas e depois criar a nova deixava passar várias encomendas em simultâneo
 * (todas contavam o mesmo número). Agora cada encomenda ocupa um "lugar" na lista
 * Restaurant.activeOrderIds, e o lugar só é dado se a lista tiver menos do que o máximo:
 * a condição e a escrita acontecem numa única operação do MongoDB sobre um só documento.
 *
 * A lista pode ficar desatualizada (encomendas antigas, alterações feitas fora da aplicação).
 * Quando não há lugar, é reconstruída a partir das encomendas reais em curso e tenta-se de
 * novo uma vez. A reconstrução:
 *  - mantém os lugares das encomendas que continuam em curso e tira os das que já acabaram;
 *  - acrescenta as encomendas em curso sem lugar que não estão a meio de ser criadas
 *    (encomendas anteriores a este mecanismo);
 *  - ignora as encomendas acabadas de gravar que ainda esperam por lugar (slotPending);
 *  - só grava se a lista não tiver mudado entretanto (compare-and-set).
 * A nova encomenda é gravada (com slotPending) antes de pedir o lugar; se não houver lugar, é apagada.
 */
const { trusted } = require('mongoose');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');
const { ACTIVE_STATES } = require('./restaurantRules');

/** Tenta ocupar um lugar para a encomenda. */
async function tryReserve(restaurantId, orderId, max) {
  const result = await Restaurant.updateOne(
    {
      _id: restaurantId,
      activeOrderIds: trusted({ $exists: true }),
      $expr: trusted({ $lt: [{ $size: { $ifNull: ['$activeOrderIds', []] } }, max] }),
    },
    { $addToSet: { activeOrderIds: orderId } },
  );
  return result.modifiedCount === 1;
}

/**
 * Reconstrói a lista de lugares a partir das encomendas em curso, só se ninguém a tiver
 * alterado entretanto (compare-and-set).
 */
async function reconcile(restaurantId) {
  const current = await Restaurant.findById(restaurantId).select('+activeOrderIds').lean();
  if (!current) return false;
  const held = current.activeOrderIds || [];
  const ids = await Order.find({
    restaurantId,
    state: trusted({ $in: ACTIVE_STATES }),
    $or: [{ slotPending: trusted({ $ne: true }) }, { _id: trusted({ $in: held }) }],
  }).distinct('_id');
  const unchanged = current.activeOrderIds === undefined
    ? { activeOrderIds: trusted({ $exists: false }) }
    : { activeOrderIds: current.activeOrderIds };
  const result = await Restaurant.updateOne({ _id: restaurantId, ...unchanged }, { $set: { activeOrderIds: ids } });
  return result.modifiedCount === 1 || result.matchedCount === 1;
}

/**
 * Ocupa um lugar para a encomenda (que já tem de estar gravada).
 *
 * @returns {Promise<boolean>} false se o restaurante já tiver o máximo de encomendas em curso
 */
async function reserveOrderSlot(restaurantId, orderId, max) {
  let reserved = await tryReserve(restaurantId, orderId, max);
  if (!reserved) {
    await reconcile(restaurantId);
    reserved = await tryReserve(restaurantId, orderId, max);
  }
  if (reserved) await Order.updateOne({ _id: orderId }, { $unset: { slotPending: 1 } });
  return reserved;
}

/** Liberta o lugar de uma encomenda que terminou (entregue ou cancelada) ou foi apagada. */
async function releaseOrderSlot(restaurantId, orderId) {
  await Restaurant.updateOne({ _id: restaurantId }, { $pull: { activeOrderIds: orderId } });
}

module.exports = { reserveOrderSlot, releaseOrderSlot, reconcile };
