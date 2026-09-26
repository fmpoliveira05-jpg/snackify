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
  status: { type: String, enum: VOUCHER_STATUSES, default: 'pending', index: true },
  paymentMethod: { type: String, enum: ['stripe', 'simulado'] },
  stripeSessionId: { type: String, index: true, sparse: true },
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Voucher', voucherSchema);
module.exports.VOUCHER_STATUSES = VOUCHER_STATUSES;
