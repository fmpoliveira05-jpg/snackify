const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { isCustomer } = require('../middlewares/roleMiddleware');
const {
    listRestaurants,
    listMenus,
    listDishes
} = require('../controllers/customerController');

router.get('/restaurantes', auth, isCustomer, listRestaurants);
router.get('/restaurantes/:id/menus', auth, isCustomer, listMenus);
router.get('/menus/:id/pratos', auth, isCustomer, listDishes);

module.exports = router;