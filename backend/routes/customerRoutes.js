const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { isCustomer } = require('../middlewares/roleMiddleware');
const {
    listRestaurants,
    readRestaurant,
    readMenu,
    listMenus,
    listDishes,
    showCustomerDashboard,
    viewCart,
    checkout,
    addToCart,
    removeFromCart,
    clearCart,
    createOrderFromCart,
    createStripeSession,
    handlePaymentSuccess
} = require('../controllers/customerController');

/**
 * @swagger
 * /cliente/api/restaurantes:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar os restaurantes disponíveis para encomendar comida na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de restaurantes.
 */
router.get('/restaurantes', auth, isCustomer, listRestaurants);

/**
 * @swagger
 * /cliente/api/restaurantes/{id}:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar um restaurante específico na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do restaurante.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do restaurante.
 */
router.get('/restaurantes/:id', auth, isCustomer, readRestaurant);

/**
 * @swagger
 * /cliente/api/menus/{id}:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar um menu específico de um determinado restaurante na página através do Angular
 *     tags: [Cliente]
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
 *         description: Dados do menu.
 */
router.get('/menus/:id', auth, isCustomer, readMenu);

/**
 * @swagger
 * /cliente/api/restaurantes/{id}/menus:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar os menus de um determinado restaurante na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do restaurante.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de menus.
 */
router.get('/restaurantes/:id/menus', auth, isCustomer, listMenus);

/**
 * @swagger
 * /cliente/api/menus/{id}/pratos:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar os pratos de um menu de um determinado restaurante na página através do Angular
 *     tags: [Cliente]
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
 *         description: Lista de pratos.
 */
router.get('/menus/:id/pratos', auth, isCustomer, listDishes);

/**
 * @swagger
 * /cliente/api/dashboard:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a área de acesso do cliente na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Painel com informações do cliente.
 */
router.get('/dashboard', auth, isCustomer, showCustomerDashboard);

/**
 * @swagger
 * /cliente/api/carrinho:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar o carrinho de compras na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteúdo do carrinho.
 */
router.get('/carrinho', auth, isCustomer, viewCart);

/**
 * @swagger
 * /cliente/api/carrinho/checkout:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a página que exibe a encomenda registada após o cliente finalizar o seu pedido (ainda antes do pagamento) na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados para checkout.
 */
router.get('/carrinho/checkout', auth, isCustomer, checkout);

/**
 * @swagger
 * /cliente/api/carrinho/pagamento-sucesso:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de confirmar o pagamento da encomenda e a encomenda passar ao estado de “concluída” na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Confirmação de pagamento.
 */
router.get('/carrinho/pagamento-sucesso', auth, isCustomer, handlePaymentSuccess);

/**
 * @swagger
 * /cliente/api/carrinho/adicionar:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de adicionar um prato ao carrinho de compras do cliente na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pratoId:
 *                 type: string
 *               quantidade:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Prato adicionado ao carrinho.
 */
router.post('/carrinho/adicionar', auth, isCustomer, addToCart);

/**
 * @swagger
 * /cliente/api/carrinho/remover:
 *   delete:
 *     summary: Nós criamos esta rota com o objetivo de remover um prato do carrinho de compras do cliente na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pratoId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Prato removido do carrinho.
 */
router.delete('/carrinho/remover', auth, isCustomer, removeFromCart);

/**
 * @swagger
 * /cliente/api/carrinho/limpar:
 *   delete:
 *     summary: Nós criamos esta rota com o objetivo de limpar todos os itens do carrinho de compras do cliente na página quando o tempo limite para concluir a encomenda (10 min) é excedido através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carrinho limpo com sucesso.
 *       401:
 *         description: Não autorizado – o utilizador não está autenticado.
 *       500:
 *         description: Erro interno ao tentar limpar o carrinho.
 */
router.delete('/carrinho/limpar', auth, isCustomer, clearCart);

/**
 * @swagger
 * /cliente/api/carrinho/finalizar:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de criar a encomenda propriamente dita após o cliente finalizar a sua encomenda (ainda antes do pagamento) na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso.
 */
router.post('/carrinho/finalizar', auth, isCustomer, createOrderFromCart);

/**
 * @swagger
 * /cliente/api/carrinho/create-checkout-session:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de criar uma sessão de pagamento da Stripe API no site para o cliente na página através do Angular
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessão de pagamento criada.
 */
router.post('/carrinho/create-checkout-session', auth, isCustomer, createStripeSession);

module.exports = router;