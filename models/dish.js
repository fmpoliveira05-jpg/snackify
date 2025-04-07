const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
    menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
    name: { type: String, required: true },
    description: String,
    category: { type: String, enum: ['Carne', 'Peixe', 'Vegetariano', 'Sobremesa'], required: true },
    price: { type: Number, required: true },
    image: String,
    nutriInfo: String
});

module.exports = mongoose.model('Dish', dishSchema);