const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const auth = require('../middlewares/authMiddleware');
const userValidator = require('../middlewares/frontend-validations/userValidator');
const restaurantValidator = require('../middlewares/frontend-validations/restaurantValidator');
const validateRequest = require('../middlewares/frontend-validations/validateRequest');
const { isCustomer, isRestaurant } = require('../middlewares/roleMiddleware');
const {
  updateOrderState,
  getProfile,
  getOrderHistory,
  updateProfile,
  cancelOrder,
  submitReview,
  renderReviewPage,
  loadOrderDetails
} = require('../controllers/profileController');

const getValidatorForUser = (userType) => {
  if (!userType) throw new Error('Tipo de utilizador indefinido.');

  if (userType === 'customer') return userValidator.customerUpdateValidator;
  if (userType === 'restaurant') return restaurantValidator.restaurantUpdateValidator;
  if (userType === 'admin') return userValidator.customerUpdateValidator;

  throw new Error(`Tipo de utilizador desconhecido: ${userType}`);
};

router.patch('/api/orders/:id/state', auth, isRestaurant, updateOrderState);



/**
 * @swagger
 * /perfil/dados:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de abrir a página com os dados do utilizador em JSON
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do perfil.
 */
router.get('/perfil/dados', auth, getProfile);

/**
 * @swagger
 * /perfil/encomendas:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de abrir a página com o histórico das encomendas do utilizador em JSON
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de encomendas.
 */
router.get('/perfil/encomendas/', auth, getOrderHistory);

/**
 * @swagger
 * /perfil/encomendas/{orderId}/avaliar:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de abrir a página que permite ao cliente avaliar a encomenda após ter sido entregue
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: ID da encomenda.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Formulário de avaliação.
 */
router.get('/perfil/encomendas/:orderId/avaliar', auth, isCustomer, renderReviewPage);

/**
 * @swagger
 * /perfil/editar:
 *   put:
 *     summary: Nós criamos esta rota com o objetivo de enviar os dados do utilizador atualizados para a rota
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso.
 *       400:
 *         description: Dados inválidos.
 */
router.put(
  '/perfil/editar',
  auth,
  upload.single('image'),
  (req, res, next) => {
    if (!req.user || !req.user.userType) {
      return next(new Error('Utilizador não autenticado ou tipo de utilizador ausente.'));
    }

    const validator = getValidatorForUser(req.user.userType);
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
  validateRequest(null),
  updateProfile
);

/**
 * @swagger
 * /perfil/encomendas/{orderId}/cancelar:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de permitir ao utilizador cancelar uma encomenda cumprindo as regras de negócio da empresa
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: ID da encomenda.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Encomenda cancelada com sucesso.
 *       400:
 *         description: Não foi possível cancelar a encomenda.
 */
router.post('/perfil/encomendas/:orderId/cancelar', auth, isCustomer, cancelOrder);

/**
 * @swagger
 * /perfil/encomendas/{orderId}/avaliar:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de submeter a avaliação do cliente
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: ID da encomenda.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagem:
 *                 type: string
 *                 format: binary
 *               pontuacao:
 *                 type: integer
 *               comentario:
 *                 type: string
 *     responses:
 *       201:
 *         description: Avaliação submetida com sucesso.
 *       400:
 *         description: Dados inválidos ou falha na submissão.
 */
router.post('/perfil/encomendas/:orderId/avaliar', auth, isCustomer, upload.single('image'), submitReview);

/**
 * @swagger
 * /perfil/encomendas/{orderId}:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar os detalhes de uma encomenda específica feita pelo cliente
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         description: ID da encomenda cujos detalhes devem ser carregados.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes da encomenda retornados com sucesso.
 *       401:
 *         description: Não autorizado.
 *       403:
 *         description: Acesso proibido. Apenas clientes podem aceder a esta informação.
 *       404:
 *         description: Encomenda não encontrada.
 */
router.get('/perfil/encomendas/:orderId', auth, isCustomer, loadOrderDetails);

module.exports = router;