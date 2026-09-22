const mongoose = require('mongoose');
const {
  nameValidator,
  usernameValidator,
  emailValidator,
  passwordValidator,
  foundedAtValidator,
  streetValidator,
  numberValidator,
  floorValidator,
  zipCodeValidator,
  placeValidator,
  districtValidator,
  countryValidator,
  phoneValidator,
  nifValidator
} = require('./backend-validations/restaurantValidations');

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, validate: nameValidator },
  username: { type: String, unique: true, required: true, validate: usernameValidator },
  email: { type: String, unique: true, required: true, validate: emailValidator },
  password: { type: String, required: true, select: false },
  address: {
    street: { type: String, required: true, validate: streetValidator },
    number: { type: String, required: true, validate: numberValidator },
    floor: { type: String, default: null, validate: floorValidator },
    zipCode: { type: String, required: true, validate: zipCodeValidator },
    place: { type: String, required: true, validate: placeValidator },
    district: { type: String, required: true, validate: districtValidator },
    country: { type: String, required: true, validate: countryValidator },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    }
  },
  phone: { type: String, required: true, validate: phoneValidator },
  nif: { type: String, required: true, validate: nifValidator },
  logo: { type: String },
  foundedAt: { type: Date, required: true, validate: foundedAtValidator },
  isChecked: { type: Boolean, default: false },
  // Regras de funcionamento definidas pelo restaurante (ver services/restaurantRules.js).
  settings: {
    preparationMinutes: { type: Number, default: 20, min: 1, max: 240 },
    deliveryMinutes: { type: Number, default: 15, min: 1, max: 240 },
    maxDeliveryKm: { type: Number, default: 10, min: 0.5, max: 100 },
    maxActiveOrders: { type: Number, default: 20, min: 1, max: 500 }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);