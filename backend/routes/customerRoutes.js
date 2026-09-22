const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { isCustomer } = require('../middlewares/roleMiddleware');
const {
    listRestaurants,
    searchDishes,
    listCategories,
    listVouchers,
    buyVoucher,
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
 * /cliente/api/pratos:
 *   get:
 *     summary: Pesquisa pratos de todos os restaurantes validados, com filtros e ordenação
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Texto no nome ou na descrição }
 *       - { in: query, name: category, schema: { type: string }, description: Id da categoria }
 *       - { in: query, name: restaurant, schema: { type: string }, description: Nome do restaurante }
 *       - { in: query, name: location, schema: { type: string }, description: Localidade ou distrito }
 *       - { in: query, name: minPrice, schema: { type: number } }
 *       - { in: query, name: maxPrice, schema: { type: number } }
 *       - { in: query, name: sort, schema: { type: string, enum: [nome, preco-asc, preco-desc] } }
 *     responses:
 *       200:
 *         description: Pratos encontrados, com o restaurante e a categoria.
 */
router.get('/pratos', auth, isCustomer, searchDishes);

/**
 * @swagger
 * /cliente/api/categorias:
 *   get:
 *     summary: Lista as categorias de pratos (para os filtros)
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categorias ordenadas pelo nome.
 */
router.get('/categorias', auth, isCustomer, listCategories);

/**
 * @swagger
 * /cliente/api/vales:
 *   get:
 *     summary: Lista os vales de refeição do cliente e os valores disponíveis para compra
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Valores possíveis e vales do cliente.
 *   post:
 *     summary: Compra (simulada) um vale de refeição, para o próprio ou para oferecer
 *     tags: [Cliente]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: { type: number, enum: [5, 10, 20, 50] }
 *               giftTo: { type: string, description: Username do cliente a quem se oferece }
 *               message: { type: string, maxLength: 140 }
 *     responses:
 *       201:
 *         description: Vale criado.
 *       400:
 *         description: Valor inválido.
 *       404:
 *         description: O destinatário não existe.
 */
router.get('/vales', auth, isCustomer, listVouchers);
router.post('/vales', auth, isCustomer, buyVoucher);

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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fulfilment: { type: string, enum: [entrega, levantamento, no local], default: entrega }
 *               paymentMethod: { type: string, enum: [online, local], default: online }
 *               identityDoc: { type: string, description: Obrigatório quando o pagamento é no local }
 *               voucherCode: { type: string, description: Código de um vale de refeição do cliente }
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso (inclui as horas estimadas e o valor a pagar).
 *       400:
 *         description: Carrinho vazio, escolhas inválidas ou vale inválido.
 *       409:
 *         description: O restaurante atingiu o limite de encomendas ou a morada está fora do raio de entrega.
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