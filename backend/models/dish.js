const mongoose = require('mongoose');
const {
  nameValidator,
  descriptionValidator,
  pricePerDoseValidator
} = require('./backend-validations/dishValidations');

const dishSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  menuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu'
  },
  name: {
    type: String,
    required: true,
    validate: nameValidator
  },
  description: {
    type: String,
    validate: descriptionValidator
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  image: String,
  nutriInfo: {
    calories: Number,
    nutriScore: String,
    allergens: [String]
  },
  pricePerDose: {
    type: [
      {
        dose: {
          type: String,
          enum: ['1/2', '1'],
          required: true
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],
    validate: pricePerDoseValidator
  }
});

module.exports = mongoose.model('Dish', dishSchema);