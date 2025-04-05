const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    birthDate: { type: Date },
    address: { type: String },
    phone: { type: String },
    nif: { type: String },
    userType: { type: String, enum: ['customer', 'admin']},
    profilePicture: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);