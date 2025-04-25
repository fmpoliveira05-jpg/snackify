const express = require('express');
const router = express.Router();
const {
  listMenus,
  showAddMenuForm,
  showEditMenuForm,
  addMenu,
  updateMenu,
  deleteMenu,
  removeDishFromMenu
} = require('../controllers/menuController');
const auth = require('../middlewares/authMiddleware');
const { isRestaurant } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validation/validateRequest');
const menuValidator = require('../middlewares/validation/menuValidator');

const Menu = require('../models/menu');
const Dish = require('../models/dish');

router.get('/', auth, isRestaurant, listMenus);
router.get('/novo', auth, isRestaurant, showAddMenuForm);
router.get('/editar/:id', auth, isRestaurant, showEditMenuForm);

router.post(
    '/novo',
    auth,
    isRestaurant,
    menuValidator,
    validateRequest('menus/createMenu', async (req) => {
      const availableDishes = await Dish.find({
        menuId: null,
        restaurantId: req.user._id
      });
  
      return { availableDishes };
    }),
    addMenu
  );  

router.put(
  '/editar/:id',
  auth,
  isRestaurant,
  menuValidator,
  validateRequest('menus/updateMenu', async (req) => {
    const menu = await Menu.findById(req.params.id);

    const availableDishes = await Dish.find({
      $or: [{ menuId: null }, { menuId: { $exists: false } }],
      restaurantId: req.user._id
    });

    return { menu, availableDishes };
  }),
  updateMenu
);

router.post('/remover/:id', auth, isRestaurant, deleteMenu);
router.post('/pratos/remover/:id', auth, isRestaurant, removeDishFromMenu);

module.exports = router;