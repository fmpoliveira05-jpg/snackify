const express = require('express');
const router = express.Router();
const {
  listMenus,
  showAddMenuForm,
  showEditMenuForm,
  addMenu,
  updateMenu,
  deleteMenu,
  removeDishFromMenu,
  listDishes,
  showAddDishForm,
  showDishDetails,
  showEditDishForm,
  addDish,
  updateDish,
  deleteDish,
  showRestaurantDashboard
} = require('../controllers/restaurantController');
const upload = require('../middlewares/uploadMiddleware');
const dishValidator = require('../middlewares/validation/dishValidator');
const multer = require('multer');
const auth = require('../middlewares/authMiddleware');
const { isRestaurant } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validation/validateRequest');
const menuValidator = require('../middlewares/validation/menuValidator');

const Menu = require('../models/menu');
const Dish = require('../models/dish');
const Category = require('../models/category');

router.get('/menus', auth, isRestaurant, listMenus);
router.get('/menus/novo', auth, isRestaurant, showAddMenuForm);
router.get('/menus/editar/:id', auth, isRestaurant, showEditMenuForm);

router.post(
    '/menus/novo',
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

router.post(
  '/menus/editar/:id',
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

router.post('/menus/remover/:id', auth, isRestaurant, deleteMenu);
router.post('/menus/pratos/remover/:id', auth, isRestaurant, removeDishFromMenu);

router.get('/restaurante/:restaurantId', async (req, res) => {
  try {
    const dishes = await require('../models/dish').find({ restaurantId: req.params.restaurantId });
    res.json(dishes);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar pratos' });
  }
});

router.get('/pratos', auth, isRestaurant, listDishes);
router.get('/pratos/novo', auth, isRestaurant, showAddDishForm);
router.get('/pratos/:id', auth, isRestaurant, showDishDetails);
router.get('/pratos/editar/:id', auth, isRestaurant, showEditDishForm);

router.post(
  '/pratos/novo',
  auth,
  isRestaurant,
  upload.single('image'),
  dishValidator,
  validateRequest('dishes/createDish', async (req) => {
    const categories = await Category.find();
    return { categories };
  }),
  addDish
);

router.post(
  '/pratos/editar/:id',
  auth,
  isRestaurant,
  upload.single('image'),
  dishValidator,
  validateRequest('dishes/updateDish', async (req) => {
    const dish = await Dish.findById(req.params.id);
    const categories = await Category.find();
    return { dish, categories };
  }),
  updateDish
);

router.get('/dashboard', auth, isRestaurant, showRestaurantDashboard);

router.post('/pratos/remover/:id', auth, isRestaurant, deleteDish);
module.exports = router;