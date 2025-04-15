const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { showCustomerRegisterPage, showRestaurantRegisterPage, customerRegister, login, restaurantRegister, logout, showLoginPage } = require('../controllers/authController');

router.get('/login', showLoginPage);
router.get('/register/customer', showCustomerRegisterPage);
router.get('/register/restaurant', showRestaurantRegisterPage);

router.post('/register/customer', upload.single('profilePicture'), customerRegister);
router.post('/register/restaurant', upload.single('logo'), restaurantRegister);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;