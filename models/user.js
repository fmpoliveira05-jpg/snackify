const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String },
    profilePicture: { type: String },
    birthDate: { type: Date },
    date: { type: Date },
    address: { type: String },
    phone: { type: String },
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    userType: { type: String, enum: ['customer', 'restaurant'] },
    logo: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);