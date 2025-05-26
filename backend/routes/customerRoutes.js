const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { isCustomer } = require('../middlewares/roleMiddleware');
const {
    listRestaurants,
    readRestaurant,
    readMenu,
    listMenus,
    listDishes,
    showCustomerDashboard,
    viewCart,
    checkout,
    addToCart,
    removeFromCart,
    createOrderFromCart,
    createStripeSession,
    handlePaymentSuccess
} = require('../controllers/customerController');

router.get('/restaurantes', auth, isCustomer, listRestaurants);
router.get('/restaurantes/:id', auth, isCustomer, readRestaurant);
router.get('/menus/:id', auth, isCustomer, readMenu);
router.get('/restaurantes/:id/menus', auth, isCustomer, listMenus);
router.get('/menus/:id/pratos', auth, isCustomer, listDishes);

router.get('/dashboard', auth, isCustomer, showCustomerDashboard);

router.get('/carrinho', auth, isCustomer, viewCart);
router.get('/carrinho/checkout', auth, isCustomer, checkout);
router.get('/carrinho/pagamento-sucesso', auth, isCustomer, handlePaymentSuccess);

router.post('/carrinho/adicionar', auth, isCustomer, addToCart);
router.post('/carrinho/remover', auth, isCustomer, removeFromCart);
router.post('/carrinho/finalizar', auth, isCustomer, createOrderFromCart);
router.post('/carrinho/create-checkout-session', auth, isCustomer, createStripeSession);

module.exports = router;