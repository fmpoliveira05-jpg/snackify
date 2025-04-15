const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { isRestaurant, isCustomer } = require('../middlewares/roleMiddleware');
const {
  showRestaurantDashboard,
  showCustomerDashboard
} = require('../controllers/dashboardController');

router.get('/restaurant', auth, isRestaurant, showRestaurantDashboard);
router.get('/customer', auth, isCustomer, showCustomerDashboard);

module.exports = router;