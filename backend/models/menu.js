const mongoose = require('mongoose');
const {
  titleValidator,
  descriptionValidator
} = require('./backend-validations/menuValidations');

const menuSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  title: {
    type: String,
    required: true,
    validate: titleValidator
  },
  description: {
    type: String,
    validate: descriptionValidator
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Menus de um restaurante; a pesquisa por título/descrição do back-office filtra dentro destes.
menuSchema.index({ restaurantId: 1, createdAt: -1 });

module.exports = mongoose.model('Menu', menuSchema);