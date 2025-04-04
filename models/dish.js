const mongoose = require('mongoose');

const DishSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }
});

module.exports = mongoose.model('Dish', DishSchema);