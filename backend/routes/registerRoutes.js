const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { redirectIfAuthenticated: checkUser } = require('../middlewares/authMiddleware');

const {
    showCustomerRegisterPage,
    showRestaurantRegisterPage,
    customerRegister,
    restaurantRegister
} = require('../controllers/registerController');

const customerValidator = require('../middlewares/frontend-validations/userValidator');
const restaurantValidator = require('../middlewares/frontend-validations/restaurantValidator');
const validateRequest = require('../middlewares/frontend-validations/validateRequest');

/**
 * @swagger
 * /registar-cliente:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a página de registo para clientes
 *     tags: [Registo]
 *     responses:
 *       200:
 *         description: Página de registo de cliente carregada com sucesso.
 */
router.get('/registar-cliente', checkUser, showCustomerRegisterPage);

/**
 * @swagger
 * /registar-restaurante:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a página de registo para restaurantes
 *     tags: [Registo]
 *     responses:
 *       200:
 *         description: Página de registo de restaurante carregada com sucesso.
 */
router.get('/registar-restaurante', checkUser, showRestaurantRegisterPage);

/**
 * @swagger
 * /registar-cliente:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de permitir que um cliente se registe na plataforma
 *     tags: [Registo]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmarPassword:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Cliente registado com sucesso.
 *       400:
 *         description: Dados inválidos ou erro de validação.
 */
router.post(
    '/registar-cliente',
    checkUser,
    upload.single('profilePicture'),
    customerValidator.customerRegisterValidator,
    validateRequest('auth/customerRegister'),
    customerRegister
);

/**
 * @swagger
 * /registar-restaurante:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de permitir que um restaurante se registe na plataforma
 *     tags: [Registo]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmarPassword:
 *                 type: string
 *               morada:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Restaurante registado com sucesso.
 *       400:
 *         description: Dados inválidos ou erro de validação.
 */
router.post(
    '/registar-restaurante',
    checkUser,
    upload.single('logo'),
    restaurantValidator.restaurantRegisterValidator,
    validateRequest('auth/restaurantRegister'),
    restaurantRegister
);

module.exports = router;