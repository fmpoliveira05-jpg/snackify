const mongoose = require('mongoose');

/**
 * Vale de refeição: comprado por um cliente para si ou oferecido a outro cliente.
 * O saldo vai sendo descontado nas encomendas até chegar a zero.
 */
const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  value: { type: Number, required: true, min: 1 },
  balance: { type: Number, required: true, min: 0 },
  message: { type: String, maxlength: 140 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Voucher', voucherSchema);
