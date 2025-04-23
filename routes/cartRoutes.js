const express = require('express');
const router = express.Router();
const { addToCart } = require('../controllers/cartController');

router.post('/adicionar', addToCart);

module.exports = router;