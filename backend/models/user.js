const mongoose = require('mongoose');
const {
  nameValidator,
  usernameValidator,
  emailValidator,
  birthDateValidator,
  streetValidator,
  numberValidator,
  floorValidator,
  zipCodeValidator,
  placeValidator,
  districtValidator,
  countryValidator,
  phoneValidator,
  nifValidator
} = require('./backend-validations/userValidations');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, validate: nameValidator },
  username: { type: String, unique: true, required: true, validate: usernameValidator },
  email: { type: String, unique: true, required: true, validate: emailValidator },
  password: { type: String, required: true, select: false },
  birthDate: { type: Date, required: true, validate: birthDateValidator },
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
  nif: { type: String, validate: nifValidator },
  userType: { type: String, enum: ['customer', 'admin'] },
  profilePicture: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);