/**
 * Pagamentos com o Stripe Checkout (encomendas e vales de refeição).
 *
 * Um pagamento só é dado como feito depois de confirmado pelo próprio Stripe, por um de
 * dois caminhos independentes (ambos idempotentes, por isso podem chegar os dois):
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

/**
 * Marca a encomenda como paga, se a sessão do Stripe for mesmo desta encomenda e estiver paga.
 * Só uma encomenda "pendente" muda de estado, por isso repetir não tem efeito.
 *
 * @returns {Promise<boolean>} true se a sessão confirma o pagamento desta encomenda
 */
async function confirmOrderPayment(session, expectedOrderId = null) {
  const orderId = session?.metadata?.orderId;
  if (!isPaid(session) || session.metadata?.type === 'voucher' || !orderId) return false;
  if (expectedOrderId && String(expectedOrderId) !== orderId) return false;

  const order = await Order.findById(orderId);
  if (!order) return false;
  if (session.metadata.userId && String(order.userId) !== session.metadata.userId) return false;

  await Order.updateOne({ _id: order._id, state: 'pendente' }, { $set: { state: 'concluída' } });
  return true;
}

/**
 * Ativa o vale pago: passa de "pending" a "active" e recebe o saldo igual ao valor.
 * Confirma o montante e a moeda cobrados. Repetir não volta a dar saldo (só um vale pendente é alterado).
 *
 * @returns {Promise<boolean>} true se a sessão confirma o pagamento deste vale
 */
async function confirmVoucherPayment(session, expectedVoucherId = null) {
  const voucherId = session?.metadata?.voucherId;
  if (!isPaid(session) || session.metadata?.type !== 'voucher' || !voucherId) return false;
  if (expectedVoucherId && String(expectedVoucherId) !== voucherId) return false;

  const voucher = await Voucher.findById(voucherId);
  if (!voucher) return false;
  if (voucher.stripeSessionId && voucher.stripeSessionId !== session.id) return false;
  if (session.metadata.userId && String(voucher.buyerId) !== session.metadata.userId) return false;
  if (session.currency !== 'eur' || session.amount_total !== Math.round(voucher.value * 100)) {
    console.error(`[stripe] Montante inesperado na sessão do vale ${voucher._id}.`);
    return false;
  }

  await Voucher.updateOne(
    { _id: voucher._id, status: 'pending' },
    { $set: { status: 'active', balance: voucher.value, paidAt: new Date(), paymentMethod: 'stripe' } },
  );
  return true;
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
