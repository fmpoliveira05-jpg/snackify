const express = require('express');
const router = express.Router();
const { listMenus, showAddMenuForm, addMenu } = require('../controllers/menuController');
const authRestaurant = require('../middlewares/authRestaurantMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', authRestaurant, listMenus);
router.get('/novo', authRestaurant, showAddMenuForm);
router.post('/novo', authRestaurant, upload.any(), addMenu);

module.exports = router;