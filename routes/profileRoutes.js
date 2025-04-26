const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const auth = require('../middlewares/authMiddleware');
const customerUpdateValidator = require('../middlewares/validation/customerUpdateValidator');
const restaurantUpdateValidator = require('../middlewares/validation/restaurantUpdateValidator');
const validateRequest = require('../middlewares/validation/validateRequest');
const { isCustomer } = require('../middlewares/roleMiddleware');
const {
  renderProfilePage,
  renderUpdateProfilePage,
  getProfile,
  getOrderHistory,
  updateProfile,
  cancelOrder,
  submitReview,
  hasReview,
  renderReviewPage
} = require('../controllers/profileController');

const getValidatorForUser = (user) => {
  return user.userType === 'customer' ? customerUpdateValidator : restaurantUpdateValidator;
};

router.get('/perfil', auth, renderProfilePage);
router.get('/perfil/editar', auth, renderUpdateProfilePage);
router.get('/perfil/dados', auth, getProfile);
router.get('/perfil/encomendas', auth, getOrderHistory);
router.get('/perfil/encomendas/:orderId/avaliar', auth, isCustomer, renderReviewPage);

router.post(
  '/perfil/editar',
  auth,
  upload.single('image'),
  (req, res, next) => {
    const validator = getValidatorForUser(req.user);
    if (!validator || !Array.isArray(validator)) {
      return next(new Error('Validador não encontrado ou inválido.'));
    }

    let index = 0;
    const run = () => {
      if (index >= validator.length) return next();
      const middleware = validator[index];
      middleware(req, res, (err) => {
        if (err) return next(err);
        index++;
        run();
      });
    };
    run();
  },
  validateRequest('profile/updateProfile'),
  updateProfile
);

router.post('/perfil/encomendas/:orderId/cancelar', auth, isCustomer, cancelOrder);
router.post('/perfil/encomendas/:orderId/avaliar', auth, isCustomer, upload.single('image'), submitReview);

module.exports = router;