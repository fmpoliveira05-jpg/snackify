const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const { showPendingRestaurants, validateRestaurant } = require('../controllers/adminController');

router.get('/validar-restaurantes', authMiddleware, isAdmin, showPendingRestaurants);
router.post('/validar-restaurante/:id', authMiddleware, isAdmin, validateRestaurant);

module.exports = router;