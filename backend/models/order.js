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
    reviewed: { type: Boolean, default: false }
  });

  module.exports = mongoose.model('Order', orderSchema);