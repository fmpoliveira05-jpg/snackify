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
    identityDoc: String,
    reviewed: { type: Boolean, default: false }
  });

  module.exports = mongoose.model('Order', orderSchema);