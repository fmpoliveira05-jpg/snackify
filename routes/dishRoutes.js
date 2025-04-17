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
const upload = require('../middlewares/uploadMiddleware');

router.get('/', auth, isRestaurant, listDishes);
router.get('/novo', auth, isRestaurant, showAddDishForm);
router.get('/:id', auth, isRestaurant, showDishDetails);
router.get('/editar/:id', auth, isRestaurant, showEditDishForm);

router.post('/novo', auth, isRestaurant, upload.single('image'), addDish);
router.post('/editar/:id', auth, isRestaurant, upload.single('image'), updateDish);
router.post('/remover/:id', auth, isRestaurant, deleteDish);

module.exports = router;