const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const auth = require('../middlewares/authMiddleware');
const {
  renderProfilePage,
  renderUpdateProfilePage,
  getProfile,
  updateProfile
} = require('../controllers/profileController');

router.get('/perfil', auth, renderProfilePage);
router.get('/perfil/editar', auth, renderUpdateProfilePage);
router.get('/perfil/dados', auth, getProfile);
router.put('/perfil/editar', auth, upload.single('image'), updateProfile);

module.exports = router;