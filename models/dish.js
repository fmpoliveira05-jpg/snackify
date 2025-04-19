const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: false },
    name: { type: String, required: true },
    description: String,
    category: { type: String, enum: ['Carne', 'Peixe', 'Vegetariano', 'Sobremesa'], required: true },
    image: String,
    nutriInfo: {
        calories: Number,
        nutriScore: String,
        allergens: [String]
    },
    pricePerDose: [
        {
            dose: { type: String, enum: ['1/2', '1'], required: true },
            price: { type: Number, required: true }
        }
    ]
});

module.exports = mongoose.model('Dish', dishSchema);