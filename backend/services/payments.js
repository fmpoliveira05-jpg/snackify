/**
 * Pagamentos com o Stripe Checkout (encomendas e vales de refeição).
 *
 * Um pagamento só é dado como feito depois de confirmado pelo próprio Stripe, por um de
 * dois caminhos independentes (ambos idempotentes e atómicos, por isso podem chegar os dois,
 * até ao mesmo tempo, sem aplicar o pagamento duas vezes):
 *  1. regresso do cliente ao success_url: a sessão é pedida ao Stripe (sessions.retrieve);
 *  2. webhook checkout.session.completed, com a assinatura verificada (STRIPE_WEBHOOK_SECRET).
 */
const Stripe = require('stripe');
const Order = require('../models/order');
const Voucher = require('../models/voucher');
const { config } = require('../config/env');

let cached = { key: null, client: null };

/** Cliente do Stripe, ou null se STRIPE_SECRET_KEY não estiver configurada. */
const getStripe = () => {
  if (!config.stripeSecretKey) return null;
  if (cached.key !== config.stripeSecretKey) {
    cached = { key: config.stripeSecretKey, client: Stripe(config.stripeSecretKey, {
      timeout: config.timeouts.stripe,
      // Os POST repetidos levam a mesma chave de idempotência (gerada pela biblioteca ou por nós).
      maxNetworkRetries: config.stripeMaxNetworkRetries,
    }) };
  }
  return cached.client;
};

const isPaid = (session) => session?.payment_status === 'paid' && session?.status !== 'expired';

/** Id do PaymentIntent da sessão (texto ou objeto expandido). */
const paymentIntentOf = (session) => {
  const pi = session?.payment_intent;
  if (typeof pi === 'string') return pi;
  return typeof pi?.id === 'string' ? pi.id : undefined;
};

const cents = (euros) => Math.round(euros * 100);

/**
 * Marca a encomenda como paga, se a sessão do Stripe for mesmo desta encomenda, estiver paga e
 * tiver o montante certo.
 *
 * A passagem "pendente" → "concluída" é uma única operação atómica (findOneAndUpdate com o
 * estado na condição): o regresso do cliente e o webhook podem chegar ao mesmo tempo e só um
 * deles aplica o pagamento. Os índices únicos em stripeSessionId e paymentIntentId impedem que
 * a mesma sessão ou o mesmo pagamento sirvam para duas encomendas.
 *
 * @returns {Promise<{ok: boolean, applied: boolean}>} ok: a sessão confirma o pagamento desta
 *          encomenda; applied: foi este pedido que mudou o estado
 */
async function confirmOrderPayment(session, expectedOrderId = null) {
  const failed = { ok: false, applied: false };
  const orderId = session?.metadata?.orderId;
  if (!isPaid(session) || session.metadata?.type === 'voucher' || !orderId) return failed;
  if (expectedOrderId && String(expectedOrderId) !== orderId) return failed;

  const order = await Order.findById(orderId);
  if (!order) return failed;
  if (session.metadata.userId && String(order.userId) !== session.metadata.userId) return failed;
  if (typeof order.total === 'number') {
    const expected = cents(order.total - (order.discount || 0));
    if (session.currency !== 'eur' || session.amount_total !== expected) {
      console.error(`[stripe] Montante inesperado na sessão da encomenda ${order._id}.`);
      return failed;
    }
  }

  const paymentIntentId = paymentIntentOf(session);
  let updated;
  try {
    updated = await Order.findOneAndUpdate(
      { _id: order._id, state: 'pendente' },
      { $set: { state: 'concluída', paidAt: new Date(), stripeSessionId: session.id, ...(paymentIntentId && { paymentIntentId }) } },
      { new: true, projection: { _id: 1 } },
    );
  } catch (err) {
    if (err?.code === 11000) {
      console.error(`[stripe] A sessão ou o pagamento já estão associados a outra encomenda (${order._id}).`);
      return failed;
    }
    throw err;
  }
  if (updated) return { ok: true, applied: true };

  // Já não estava pendente: é a repetição do mesmo pagamento (idempotente) ou um pagamento a mais.
  const current = await Order.findById(order._id).select('state stripeSessionId').lean();
  if (current?.state !== 'cancelada' && current?.stripeSessionId === session.id) return { ok: true, applied: false };
  console.error(`[stripe] Pagamento recebido para a encomenda ${order._id} que já não está pendente: verificar e reembolsar no painel do Stripe.`);
  return failed;
}

/**
 * Ativa o vale pago: passa de "pending" a "active" e recebe o saldo igual ao valor.
 * Confirma o montante e a moeda cobrados. Repetir não volta a dar saldo (só um vale pendente
 * é alterado, numa operação atómica).
 *
 * @returns {Promise<{ok: boolean, applied: boolean}>}
 */
async function confirmVoucherPayment(session, expectedVoucherId = null) {
  const failed = { ok: false, applied: false };
  const voucherId = session?.metadata?.voucherId;
  if (!isPaid(session) || session.metadata?.type !== 'voucher' || !voucherId) return failed;
  if (expectedVoucherId && String(expectedVoucherId) !== voucherId) return failed;

  const voucher = await Voucher.findById(voucherId);
  if (!voucher) return failed;
  if (voucher.stripeSessionId && voucher.stripeSessionId !== session.id) return failed;
  if (session.metadata.userId && String(voucher.buyerId) !== session.metadata.userId) return failed;
  if (session.currency !== 'eur' || session.amount_total !== cents(voucher.value)) {
    console.error(`[stripe] Montante inesperado na sessão do vale ${voucher._id}.`);
    return failed;
  }

  const paymentIntentId = paymentIntentOf(session);
  let result;
  try {
    result = await Voucher.updateOne(
      { _id: voucher._id, status: 'pending' },
      {
        $set: {
          status: 'active',
          balance: voucher.value,
          paidAt: new Date(),
          paymentMethod: 'stripe',
          stripeSessionId: session.id,
          ...(paymentIntentId && { paymentIntentId }),
        },
      },
    );
  } catch (err) {
    if (err?.code === 11000) {
      console.error(`[stripe] A sessão ou o pagamento já estão associados a outro vale (${voucher._id}).`);
      return failed;
    }
    throw err;
  }
  if (result?.modifiedCount === 1) return { ok: true, applied: true };

  const current = await Voucher.findById(voucher._id).select('status').lean();
  return current?.status === 'active' ? { ok: true, applied: false } : failed;
}

/**
 * Trata um evento do webhook (já com a assinatura verificada).
 */
async function handleStripeEvent(event) {
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return;
  }
  const session = event.data.object;
  if (session.metadata?.type === 'voucher') {
    await confirmVoucherPayment(session);
  } else {
    await confirmOrderPayment(session);
  }
}

module.exports = { getStripe, confirmOrderPayment, confirmVoucherPayment, handleStripeEvent };
