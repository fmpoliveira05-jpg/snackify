const express = require('express');
const router = express.Router();
const {
  listMenus,
  searchMenus,
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
  showRestaurantDashboard,
  listReviews
} = require('../controllers/restaurantController');
const upload = require('../middlewares/uploadMiddleware');
const dishValidator = require('../middlewares/frontend-validations/dishValidator');
const auth = require('../middlewares/authMiddleware');
const { isRestaurant } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/frontend-validations/validateRequest');
const menuValidator = require('../middlewares/frontend-validations/menuValidator');

const Menu = require('../models/menu');
const Dish = require('../models/dish');
const Category = require('../models/category');

/**
 * @swagger
 * /restaurante/menus:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de listar todos os menus criados pelo restaurante autenticado na página
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de menus.
 */
router.get('/menus', auth, isRestaurant, (req, res) => {
  if (req.query.field && req.query.value) {
    return searchMenus(req, res);
  }
  return listMenus(req, res);
});

/**
 * @swagger
 * /restaurante/menus/novo:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar o formulário que permite ao restaurante criar um menu na página
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Formulário para novo menu.
 */
router.get('/menus/novo', auth, isRestaurant, showAddMenuForm);

/**
 * @swagger
 * /restaurante/menus/editar/{id}:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a página que permite ao restaurante autenticado editar um menu existente
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do menu.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Formulário de edição.
 */
router.get('/menus/editar/:id', auth, isRestaurant, showEditMenuForm);

/**
 * @swagger
 * /restaurante/menus/novo:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de submeter o menu criado pelo restaurante autenticado
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *     responses:
 *       201:
 *         description: Menu criado com sucesso.
 */
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

/**
 * @swagger
 * /restaurante/menus/editar/{id}:
 *   put:
 *     summary: Nós criamos esta rota com o objetivo de submeter as alterações efetuadas ao menu por parte do restaurante autenticado
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do menu.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu atualizado.
 */
router.put(
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

/**
 * @swagger
 * /restaurante/menus/remover/{id}:
 *   delete:
 *     summary: Nós criamos esta rota com o objetivo de remover um menu da BD
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do menu.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu removido.
 */
router.delete('/menus/remover/:id', auth, isRestaurant, deleteMenu);

/**
 * @swagger
 * /restaurante/menus/pratos/remover/{id}:
 *   delete:
 *     summary: Nós criamos esta rota com o objetivo de remover um prato de um menu (o prato continua a existir na BD)
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do prato.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prato removido do menu.
 */
router.delete('/menus/pratos/remover/:id', auth, isRestaurant, removeDishFromMenu);

/**
 * @swagger
 * /restaurante/pratos:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar todos os pratos criados pelo restaurante na página
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pratos.
 */
router.get('/pratos', auth, isRestaurant, listDishes);

/**
 * @swagger
 * /restaurante/pratos/novo:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar o formulário que permite ao restaurante criar um prato na página
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Formulário de novo prato.
 */
router.get('/pratos/novo', auth, isRestaurant, showAddDishForm);

/**
 * @swagger
 * /restaurante/pratos/{id}:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a página que permite ao restaurante consultar um dos seus pratos
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do prato.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do prato.
 */
router.get('/pratos/:id', auth, isRestaurant, showDishDetails);

/**
 * @swagger
 * /restaurante/pratos/editar/{id}:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a página que permite ao restaurante editar os dados de um determinado prato
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do prato.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Formulário de edição.
 */
router.get('/pratos/editar/:id', auth, isRestaurant, showEditDishForm);

/**
 * @swagger
 * /restaurante/pratos/novo:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de submeter o prato criado pelo restaurante
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               preco:
 *                 type: number
 *               imagem:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Prato criado com sucesso.
 */
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

/**
 * @swagger
 * /restaurante/pratos/editar/{id}:
 *   put:
 *     summary: Nós criamos esta rota com o objetivo de submeter as alterações efetuadas ao prato por parte do restaurante
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do prato.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               preco:
 *                 type: number
 *               imagem:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Prato atualizado.
 */
router.put(
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

/**
 * @swagger
 * /restaurante/pratos/remover/{id}:
 *   delete:
 *     summary: Nós criamos esta rota com o objetivo de remover o prato da BD
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do prato.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prato removido com sucesso.
 */
router.delete('/pratos/remover/:id', auth, isRestaurant, deleteDish);

/**
 * @swagger
 * /restaurante/dashboard:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a área de acesso do restaurante
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Página de gestão do restaurante.
 */
router.get('/dashboard', auth, isRestaurant, showRestaurantDashboard);

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de permitir que um restaurante veja as avaliações feitas pelos clientes
 *     tags: [Restaurante]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de avaliações retornada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       403:
 *         description: Acesso proibido. Apenas restaurantes podem aceder a esta informação.
 */
router.get('/reviews', auth, isRestaurant, listReviews);

module.exports = router;