const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    dishes: [
      {
        dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish" },
        amount: Number,
        dose: { type: String, enum: ['1/2', '1'], required: true }
      }
    ],
    state: { type: String, enum: ["pendente", "concluída", "em preparação", "expedida", "entregue", "cancelada"], default: "pendente" },
    orderDate: { type: Date, default: Date.now },
    cancelTimeout: { type: Date },
    orderCode: String,
    // Pagamento no local: o cliente mostra o código da encomenda e este documento.
    identityDoc: String,
    fulfilment: { type: String, enum: ['entrega', 'levantamento', 'no local'], default: 'entrega' },
    paymentMethod: { type: String, enum: ['online', 'local'], default: 'online' },
    total: { type: Number, default: 0 },
    // Parte do total paga com um vale de refeição (bonificação 6d do enunciado).
    discount: { type: Number, default: 0 },
    voucherCode: String,
    estimatedReadyAt: Date,
    estimatedDeliveryAt: Date,
    reviewed: { type: Boolean, default: false },
    // Pagamento online: sessão do Stripe Checkout em uso e pagamento que a liquidou.
    stripeSessionId: String,
    paymentIntentId: String,
    paidAt: Date,
    // Chave enviada pelo cliente (cabeçalho Idempotency-Key): repetir o pedido não cria outra encomenda.
    idempotencyKey: String,
  });

/** Índice único que ignora os documentos em que o campo não existe (ou não é texto). */
const uniqueWhenSet = (field) => ({ unique: true, partialFilterExpression: { [field]: { $type: 'string' } } });

// Histórico e painel do cliente, e contagem dos cancelamentos recentes.
orderSchema.index({ userId: 1, orderDate: -1 });
// Histórico do restaurante (mais recentes primeiro).
orderSchema.index({ restaurantId: 1, orderDate: -1 });
// Encomendas em curso de um restaurante (limite de encomendas) e gráfico por estado.
orderSchema.index({ restaurantId: 1, state: 1 });
// Uma sessão do Stripe e um pagamento só podem pertencer a uma encomenda (impede pagamentos em duplicado).
orderSchema.index({ stripeSessionId: 1 }, { name: 'stripeSessionId_unico', ...uniqueWhenSet('stripeSessionId') });
orderSchema.index({ paymentIntentId: 1 }, { name: 'paymentIntentId_unico', ...uniqueWhenSet('paymentIntentId') });
orderSchema.index({ orderCode: 1 }, { name: 'orderCode_unico', ...uniqueWhenSet('orderCode') });
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { name: 'idempotencia_unica', ...uniqueWhenSet('idempotencyKey') });

module.exports = mongoose.model('Order', orderSchema);
module.exports.uniqueWhenSet = uniqueWhenSet;