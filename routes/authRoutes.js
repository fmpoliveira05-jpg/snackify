const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { userRegister, login, restaurantRegister, logout } = require('../controllers/authController');

router.post('/register/customer', upload.single('profilePicture'), userRegister);
router.post('/register/restaurant', upload.single('logo'), restaurantRegister);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;