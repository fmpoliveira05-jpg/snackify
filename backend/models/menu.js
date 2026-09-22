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

module.exports = mongoose.model('Menu', menuSchema);