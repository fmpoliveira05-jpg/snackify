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

const customerRegisterValidator = require('../middlewares/validation/customerRegisterValidator');
const restaurantRegisterValidator = require('../middlewares/validation/restaurantRegisterValidator');
const validateRequest = require('../middlewares/validation/validateRequest');

router.get('/login', showLoginPage);
router.get('/register/customer', showCustomerRegisterPage);
router.get('/register/restaurant', showRestaurantRegisterPage);

router.post(
    '/register/customer',
    upload.single('profilePicture'),
    customerRegisterValidator,
    validateRequest('auth/customerRegister'),
    customerRegister
);

router.post(
    '/register/restaurant',
    upload.single('logo'),
    restaurantRegisterValidator,
    validateRequest('auth/restaurantRegister'),
    restaurantRegister
);

router.post('/login', login);
router.post('/logout', logout);

module.exports = router;