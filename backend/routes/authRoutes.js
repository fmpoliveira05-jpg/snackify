const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middlewares/authMiddleware');

// Limita tentativas de login para dificultar ataques de força bruta às passwords.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Demasiadas tentativas de login. Tente novamente dentro de alguns minutos.' },
});
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
 *     summary: Redireciona para o login do cliente Angular (ou para a página inicial, se já houver sessão)
 *     tags: [Autenticação]
 *     responses:
 *       302:
 *         description: Redirecionamento.
 */
router.get('/login', showLoginPage);

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
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Autenticado com sucesso (o token é devolvido e guardado num cookie httpOnly).
 *       400:
 *         description: Username ou password em falta.
 *       401:
 *         description: Credenciais inválidas.
 *       403:
 *         description: Restaurante ainda não validado por um administrador.
 *       429:
 *         description: Demasiadas tentativas; tente mais tarde.
 */
router.post('/login', loginLimiter, login);

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