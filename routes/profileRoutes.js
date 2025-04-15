const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const {
  renderProfilePage,
  getProfile,
  updateProfile
} = require('../controllers/profileController');

router.get('/perfil', auth, renderProfilePage);
router.get('/perfil/dados', auth, getProfile);
router.put('/perfil', auth, updateProfile);

module.exports = router;