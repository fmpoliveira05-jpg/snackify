const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authMiddleware');
const { isCustomer } = require('../middlewares/roleMiddleware');

const {
  viewCart,
  addToCart,
  removeFromCart,
  checkout,
  createOrderFromCart
} = require('../controllers/cartController');

router.get('/', auth, isCustomer, viewCart);
router.get('/checkout', auth, isCustomer, checkout);

router.post('/adicionar', auth, isCustomer, addToCart);
router.post('/remover', auth, isCustomer, removeFromCart);
router.post('/finalizar', auth, isCustomer, createOrderFromCart);

module.exports = router;