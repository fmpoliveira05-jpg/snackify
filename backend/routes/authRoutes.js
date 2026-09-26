const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    loginLimiter,
    forgotPasswordLimiter,
    resetPasswordLimiter,
    resendVerificationLimiter,
    verifyEmailLimiter,
} = require('../middlewares/rateLimiters');
const { honeypot, turnstile } = require('../middlewares/botProtection');
const {
    getMe,
    login,
    logout,
    logoutAll,
    showLoginPage,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
} = require('../controllers/authController');

const GENERIC_EMAIL_SENT = 'Se existir uma conta associada a esse email, vai receber uma mensagem com as instruções.';

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obter dados do utilizador autenticado
 *     tags: [Autenticação]
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
 *         description: Autenticado com sucesso (o token fica apenas num cookie httpOnly; nunca é devolvido no corpo).
 *       400:
 *         description: Username ou password em falta.
 *       401:
 *         description: Credenciais inválidas.
 *       403:
 *         description: Email por confirmar ou restaurante ainda não validado por um administrador.
 *       429:
 *         description: Demasiadas tentativas; tente mais tarde.
 */
router.post('/login', loginLimiter, honeypot(), turnstile, login);

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

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Terminar todas as sessões da conta (em todos os dispositivos)
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Sessões terminadas.
 *       401:
 *         description: Sem sessão.
 */
router.post('/logout-all', authMiddleware, logoutAll);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Confirmar o email com o token recebido por email (também aceita GET com ?token=)
 *     tags: [Autenticação]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email confirmado.
 *       400:
 *         description: Link inválido ou expirado.
 */
router.get('/verify-email', verifyEmailLimiter, verifyEmail);
router.post('/verify-email', verifyEmailLimiter, verifyEmail);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Pedir um novo email de confirmação (resposta sempre genérica)
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Pedido aceite.
 */
router.post('/resend-verification', resendVerificationLimiter, honeypot(GENERIC_EMAIL_SENT), resendVerification);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Pedir um link para redefinir a password (resposta sempre genérica)
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Pedido aceite.
 */
router.post('/forgot-password', forgotPasswordLimiter, honeypot(GENERIC_EMAIL_SENT), turnstile, forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Definir uma nova password com o token recebido por email (uso único, 30 minutos)
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Password alterada; todas as sessões anteriores deixam de valer.
 *       400:
 *         description: Link inválido/expirado ou password fraca.
 */
router.post('/reset-password', resetPasswordLimiter, resetPassword);

module.exports = router;