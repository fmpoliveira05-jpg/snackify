const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authMiddleware');
const { isCustomer } = require('../middlewares/roleMiddleware');

const {
  viewCart,
  addToCart,
  removeFromCart,
  checkout,
  createOrderFromCart,
  createStripeSession,
  handlePaymentSuccess
} = require('../controllers/cartController');

router.get('/', auth, isCustomer, viewCart);
router.get('/checkout', auth, isCustomer, checkout);
router.get('/pagamento-sucesso', auth, isCustomer, handlePaymentSuccess);

router.post('/adicionar', auth, isCustomer, addToCart);
router.post('/remover', auth, isCustomer, removeFromCart);
router.post('/finalizar', auth, isCustomer, createOrderFromCart);
router.post('/create-checkout-session', auth, isCustomer, createStripeSession);

module.exports = router;