const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    dishes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dish' }]
});

module.exports = mongoose.model('Menu', MenuSchema);