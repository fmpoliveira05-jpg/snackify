/**
 * Regras de funcionamento definidas por cada restaurante (tempos, raio de entrega e limite de
 * encomendas em curso). São funções puras, testadas em tests/restaurantRules.test.js.
 */

/** Valores usados quando o restaurante ainda não configurou nada. */
const DEFAULT_SETTINGS = Object.freeze({
  preparationMinutes: 20,
  deliveryMinutes: 15,
  maxDeliveryKm: 10,
  maxActiveOrders: 20,
});

/** Estados em que uma encomenda ainda ocupa a cozinha ou a entrega. */
const ACTIVE_STATES = ['pendente', 'concluída', 'em preparação', 'expedida'];

/** Formas de receber a encomenda. */
const FULFILMENT_TYPES = ['entrega', 'levantamento', 'no local'];

/** Formas de pagamento: online (Stripe) ou no local, com o código e um documento de identificação. */
const PAYMENT_METHODS = ['online', 'local'];

const MINUTE = 60 * 1000;

/**
 * Junta as definições guardadas com os valores por omissão.
 *
 * @param {object} [settings] definições do restaurante (podem estar incompletas)
 * @returns {{preparationMinutes: number, deliveryMinutes: number, maxDeliveryKm: number, maxActiveOrders: number}}
 */
function effectiveSettings(settings = {}) {
  const result = { ...DEFAULT_SETTINGS };
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const value = Number(settings?.[key]);
    if (Number.isFinite(value) && value > 0) result[key] = value;
  });
  return result;
}

/**
 * Distância em linha reta entre dois pontos (fórmula de haversine).
 *
 * @param {{latitude: number, longitude: number}} a
 * @param {{latitude: number, longitude: number}} b
 * @returns {number} quilómetros
 */
function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** @returns {boolean} se as coordenadas existem e são números */
function hasCoordinates(c) {
  return Boolean(c) && Number.isFinite(c.latitude) && Number.isFinite(c.longitude);
}

/**
 * Decide se o restaurante pode aceitar mais uma encomenda.
 *
 * @param {object} params
 * @param {object} params.settings definições do restaurante
 * @param {number} params.activeOrders encomendas do restaurante ainda em curso
 * @param {string} params.fulfilment 'entrega', 'levantamento' ou 'no local'
 * @param {object} [params.restaurantCoords] coordenadas do restaurante
 * @param {object} [params.customerCoords] coordenadas da morada do cliente
 * @returns {{allowed: boolean, reason?: string, distanceKm?: number}}
 */
function checkOrderAllowed({ settings, activeOrders, fulfilment, restaurantCoords, customerCoords }) {
  const s = effectiveSettings(settings);
  if (activeOrders >= s.maxActiveOrders) {
    return { allowed: false, reason: 'O restaurante atingiu o número máximo de encomendas em curso. Tente daqui a pouco.' };
  }
  if (fulfilment === 'entrega' && hasCoordinates(restaurantCoords) && hasCoordinates(customerCoords)) {
    const distanceKm = haversineKm(restaurantCoords, customerCoords);
    if (distanceKm > s.maxDeliveryKm) {
      return {
        allowed: false,
        reason: `A sua morada fica a ${distanceKm.toFixed(1)} km e o restaurante só entrega até ${s.maxDeliveryKm} km.`,
        distanceKm,
      };
    }
    return { allowed: true, distanceKm };
  }
  return { allowed: true };
}

/**
 * Estima quando a encomenda fica pronta e, se for entregue, quando chega.
 *
 * @param {object} settings definições do restaurante
 * @param {string} fulfilment tipo de receção
 * @param {Date} [now]
 * @returns {{readyAt: Date, deliveredAt: (Date|null)}}
 */
function estimateTimes(settings, fulfilment, now = new Date()) {
  const s = effectiveSettings(settings);
  const readyAt = new Date(now.getTime() + s.preparationMinutes * MINUTE);
  const deliveredAt = fulfilment === 'entrega' ? new Date(readyAt.getTime() + s.deliveryMinutes * MINUTE) : null;
  return { readyAt, deliveredAt };
}

/**
 * Valida as escolhas do cliente ao finalizar a encomenda. Pagar no local exige um documento de
 * identificação, que fica associado à encomenda (tal como pede o enunciado).
 *
 * @param {{fulfilment?: string, paymentMethod?: string, identityDoc?: string}} body
 * @returns {{ok: boolean, message?: string, value?: {fulfilment: string, paymentMethod: string, identityDoc?: string}}}
 */
function validateCheckoutChoices(body = {}) {
  const fulfilment = body.fulfilment ?? 'entrega';
  const paymentMethod = body.paymentMethod ?? 'online';
  if (!FULFILMENT_TYPES.includes(fulfilment)) {
    return { ok: false, message: 'Tipo de entrega inválido.' };
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return { ok: false, message: 'Forma de pagamento inválida.' };
  }
  if (paymentMethod === 'local') {
    const doc = typeof body.identityDoc === 'string' ? body.identityDoc.trim().toUpperCase() : '';
    if (!/^[A-Z0-9 ]{6,20}$/.test(doc)) {
      return { ok: false, message: 'Para pagar no local indique o número de um documento de identificação (6 a 20 letras ou algarismos).' };
    }
    return { ok: true, value: { fulfilment, paymentMethod, identityDoc: doc } };
  }
  return { ok: true, value: { fulfilment, paymentMethod } };
}

module.exports = {
  DEFAULT_SETTINGS,
  ACTIVE_STATES,
  FULFILMENT_TYPES,
  PAYMENT_METHODS,
  effectiveSettings,
  haversineKm,
  checkOrderAllowed,
  estimateTimes,
  validateCheckoutChoices,
};
