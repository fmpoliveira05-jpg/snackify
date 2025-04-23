const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    address: {
        street: { type: String, required: true },
        number: { type: String },
        floor: { type: String },
        zipCode: { type: String, required: true },
        place: { type: String, required: true },
        district: { type: String, required: true },
        country: { type: String, required: true },
        coordinates: {
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null}
        }
    },
    phone: { type: String },
    nif: { type: String },
    logo: { type: String },
    foundedAt: { type: Date },
    isChecked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);