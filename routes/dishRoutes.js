const express = require('express');
const router = express.Router();
const {
  showEditDishForm,
  updateDish,
  deleteDish,
  showAddDishForm,
  addDish,
  listDishes,
  showDishDetails
} = require('../controllers/dishController');

const auth = require('../middlewares/authMiddleware');
const { isRestaurant } = require('../middlewares/roleMiddleware');
const { listDishesForClient } = require('../controllers/dishController');
const upload = require('../middlewares/uploadMiddleware');
const validateRequest = require('../middlewares/validation/validateRequest');
const dishValidator = require('../middlewares/validation/dishValidator');
const Dish = require('../models/dish');

router.get('/restaurante/:restaurantId', async (req, res) => {
  try {
    const dishes = await require('../models/dish').find({ restaurantId: req.params.restaurantId });
    res.json(dishes);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar pratos' });
  }
});

router.get('/', auth, isRestaurant, listDishes);
router.get('/novo', auth, isRestaurant, showAddDishForm);
router.get('/:id', auth, isRestaurant, showDishDetails);
router.get('/editar/:id', auth, isRestaurant, showEditDishForm);
router.get('/cardapio/cliente', listDishesForClient);


router.post(
  '/novo',
  auth,
  isRestaurant,
  upload.single('image'),
  dishValidator,
  validateRequest('dishes/createDish'),
  addDish
);

router.post(
  '/editar/:id',
  auth,
  isRestaurant,
  upload.single('image'),
  dishValidator,
  validateRequest('dishes/updateDish', async (req) => {
    const dish = await Dish.findById(req.params.id);
    return { dish };
  }),
  updateDish
);

router.post('/remover/:id', auth, isRestaurant, deleteDish);

module.exports = router;