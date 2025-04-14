const express = require('express');
const router = express.Router();
const { listMenus, showAddMenuForm, showEditMenuForm, addMenu, updateMenu, deleteMenu, removeDishFromMenu } = require('../controllers/menuController');
const auth = require('../middlewares/authMiddleware');
const { isRestaurant } = require('../middlewares/roleMiddleware');

router.get('/', auth, isRestaurant, listMenus);
router.get('/novo', auth, isRestaurant, showAddMenuForm);
router.get('/editar/:id', auth, isRestaurant, showEditMenuForm);
router.post('/novo', auth, isRestaurant, addMenu);
router.post('/editar/:id', auth, isRestaurant, updateMenu);
router.post('/remover/:id', auth, isRestaurant, deleteMenu);
router.post('/pratos/remover/:id', auth, isRestaurant, removeDishFromMenu);

module.exports = router;