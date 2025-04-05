const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { userRegister, login, restaurantRegister } = require('../controllers/authController');

router.post('/userRegister', upload.single('profilePicture'), userRegister);
router.post('/restaurantRegister', upload.single('logo'), restaurantRegister);
router.post('/login', login);

module.exports = router;