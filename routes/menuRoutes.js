const express = require('express');
const router = express.Router();
const { listMenus, showAddMenuForm, addMenu } = require('../controllers/menuController');
const auth = require('../middlewares/authMiddleware');
const { isRestaurant } = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', auth, isRestaurant, listMenus);
router.get('/novo', auth, isRestaurant, showAddMenuForm);
router.post('/novo', auth, isRestaurant, upload.any(), addMenu);

module.exports = router;