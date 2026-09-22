const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const checkUser = require('../middlewares/checkUserMiddleware');
const {
    getMe,
    login,
    logout,
    showLoginPage
} = require('../controllers/authController');

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obter dados do utilizador autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do utilizador.
 *       401:
 *         description: Não autorizado.
 */
router.get('/me', authMiddleware, getMe);

/**
 * @swagger
 * /auth/login:
 *   get:
 *     summary: Carregar formulário de login
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Página de login.
 */
router.get('/login', checkUser, authMiddleware, showLoginPage);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login de utilizador
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Autenticado com sucesso.
 *       401:
 *         description: Credenciais inválidas.
 */
router.post('/login', checkUser, login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Efetuar logout
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Logout efetuado com sucesso.
 */
router.post('/logout', logout);

module.exports = router;