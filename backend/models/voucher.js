const mongoose = require('mongoose');

/**
 * Vale de refeição: comprado por um cliente para si ou oferecido a outro cliente.
 * O saldo vai sendo descontado nas encomendas até chegar a zero.
 *
 * Um vale nasce "pending" (sem saldo) e só passa a "active", com o saldo igual ao valor pago,
 * depois de o pagamento ser confirmado pelo Stripe. Só os vales ativos servem nas encomendas.
 */
const VOUCHER_STATUSES = ['pending', 'active', 'cancelled'];

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  value: { type: Number, required: true, min: 1 },
  balance: { type: Number, required: true, min: 0 },
  message: { type: String, maxlength: 140 },
  status: { type: String, enum: VOUCHER_STATUSES, default: 'pending' },
  paymentMethod: { type: String, enum: ['stripe', 'simulado'] },
  stripeSessionId: String,
  paymentIntentId: String,
  paidAt: Date,
  // Chave enviada pelo cliente (cabeçalho Idempotency-Key): repetir a compra não cria outro vale.
  idempotencyKey: String,
  createdAt: { type: Date, default: Date.now }
});

const uniqueWhenSet = (field) => ({ unique: true, partialFilterExpression: { [field]: { $type: 'string' } } });

// Vales do cliente (recebidos/ativos e comprados à espera de pagamento), mais recentes primeiro.
voucherSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
voucherSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
// Uma sessão do Stripe e um pagamento só ativam um vale.
voucherSchema.index({ stripeSessionId: 1 }, { name: 'stripeSessionId_unico', ...uniqueWhenSet('stripeSessionId') });
voucherSchema.index({ paymentIntentId: 1 }, { name: 'paymentIntentId_unico', ...uniqueWhenSet('paymentIntentId') });
voucherSchema.index({ buyerId: 1, idempotencyKey: 1 }, { name: 'idempotencia_unica', ...uniqueWhenSet('idempotencyKey') });

module.exports = mongoose.model('Voucher', voucherSchema);
module.exports.VOUCHER_STATUSES = VOUCHER_STATUSES;
