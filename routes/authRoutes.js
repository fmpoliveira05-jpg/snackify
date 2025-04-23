const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const {
    showCustomerRegisterPage,
    showRestaurantRegisterPage,
    customerRegister,
    login,
    restaurantRegister,
    logout,
    showLoginPage
} = require('../controllers/authController');

const customerValidator = require('../middlewares/validation/customerValidator');
const restaurantValidator = require('../middlewares/validation/restaurantValidator');
const validateRequest = require('../middlewares/validation/validateRequest');

router.get('/login', showLoginPage);
router.get('/register/customer', showCustomerRegisterPage);
router.get('/register/restaurant', showRestaurantRegisterPage);

router.post(
    '/register/customer',
    upload.single('profilePicture'),
    customerValidator,
    validateRequest('auth/customerRegister'),
    customerRegister
);

router.post(
    '/register/restaurant',
    upload.single('logo'),
    restaurantValidator,
    validateRequest('auth/restaurantRegister'),
    restaurantRegister
);

router.post('/login', login);
router.post('/logout', logout);

module.exports = router;