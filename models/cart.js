const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: false },
    addedDate: { type: Date },
    price: { type: Date }
});

module.exports = mongoose.model('Cart', cartSchema);