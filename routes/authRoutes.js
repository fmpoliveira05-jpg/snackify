const express = require('express');
const router = express.Router();
const { registerUser, login, registerRestaurant } = require('../controllers/authController');

router.post('/registerUser', registerUser);
router.post('/registerRestaurant', registerRestaurant);
router.post('/login', login);

module.exports = router;