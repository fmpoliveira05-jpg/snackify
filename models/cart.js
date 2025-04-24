const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
          dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish" },
          amount: { type: Number, default: 1 },
          dose: { type: String, enum: ['1/2', '1'], required: true }
        }
      ],
    total: { type: Number, default: 0 },
    addedDate: { type: Date, default: Date.now },
    timeout: { type: Date }
});

module.exports = mongoose.model('Cart', cartSchema);