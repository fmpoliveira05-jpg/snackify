const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const { showPendingRestaurants, validateRestaurant, rejectRestaurant, showRestaurantDetails, showRestaurantEditPage, updateRestaurant, removeRestaurant, createCategory, showCategories} = require('../controllers/adminController');

router.get('/validar-restaurantes', authMiddleware, isAdmin, showPendingRestaurants);
router.post('/validar-restaurante/:id', authMiddleware, isAdmin, validateRestaurant);
router.post('/rejeitar-restaurante/:id', authMiddleware, isAdmin, rejectRestaurant);
router.get('/detalhes-restaurante/:id', authMiddleware, isAdmin, showRestaurantDetails);
router.get('/editar-restaurante/:id', authMiddleware, isAdmin, showRestaurantEditPage);
router.post('/editar-restaurante/:id', authMiddleware, isAdmin, updateRestaurant);
router.post('/remover-restaurante/:id', authMiddleware, isAdmin, removeRestaurant);

router.get('/editar-categorias', authMiddleware, isAdmin, showCategories);
router.post('/criar-categoria', authMiddleware, isAdmin, createCategory);

module.exports = router;