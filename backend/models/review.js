const mongoose = require('mongoose');
const { titleValidator, descriptionValidator, imageValidator } = require('./backend-validations/reviewValidation');

const reviewSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        validate: titleValidator,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        validate: descriptionValidator,
    },
    image: {
        type: String,
        validate: imageValidator,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Review', reviewSchema);