const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { isRestaurant, isCustomer } = require('../middlewares/roleMiddleware');

router.get('/restaurant', auth, isRestaurant, (req, res) => {
    res.send('Dashboard do Restaurante');
});

router.get('/customer', auth, isCustomer, (req, res) => {
    res.send('Dashboard do Cliente');
});

module.exports = router;