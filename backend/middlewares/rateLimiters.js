/**
 * Limites de pedidos (express-rate-limit).
 *
 *  - Por endereço IP: toda a API e, com limites mais apertados, login, registo e recuperação.
 *    O IP vem de req.ip, que só é fiável com TRUST_PROXY configurado quando a aplicação está
 *    atrás de um proxy (Nginx, Cloudflare, Render, ...).
 *  - Por conta (quotas): operações caras ou com custos (encomendas, pagamentos, uploads,
 *    consultas à OpenFoodFacts e exportação de dados), contadas pelo id da conta autenticada.
 *
 * Os contadores ficam em memória, por instância. Com várias instâncias, use um store partilhado
 * (ex.: rate-limit-redis) ou divida os limites pelo número de instâncias.
 * Nos testes os limites estão desligados por omissão (RATE_LIMIT_ENABLED=true liga-os).
 * Todos os valores podem ser mudados por variáveis de ambiente (ver .env.example).
 */
const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

const MINUTE = 60 * 1000;
const FIFTEEN_MINUTES = 15 * MINUTE;
const ONE_HOUR = 60 * MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

/**
 * Limite por endereço IP.
 *
 * @param {number} windowMs janela de tempo
 * @param {number} limit número máximo de pedidos na janela
 * @param {string} message mensagem devolvida com o 429
 */
const createLimiter = (windowMs, limit, message) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !config.rateLimitEnabled,
  message: { message },
});

/**
 * Quota por conta autenticada (tem de vir depois do middleware de autenticação).
 *
 * @param {number} windowMs janela de tempo
 * @param {number} limit número máximo de operações na janela
 * @param {string} message mensagem devolvida com o 429
 * @param {(req) => boolean} [skipIf] pedidos que não contam para a quota
 */
const createAccountLimiter = (windowMs, limit, message, skipIf = () => false) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => !config.rateLimitEnabled || !req.user || skipIf(req),
  keyGenerator: (req) => `conta:${req.user._id}`,
  message: { message },
});

const TRY_LATER = 'Demasiados pedidos. Tente novamente dentro de alguns minutos.';
const QUOTA = 'Atingiu o limite desta operação para a sua conta. Tente novamente mais tarde.';
const { limits } = config;

/** O webhook do Stripe é autenticado pela assinatura e não pode ser travado pelo limite por IP. */
const API_LIMIT_EXCLUDED = new Set(['/api/stripe/webhook']);
const generalApiLimiter = createLimiter(limits.apiWindowMinutes * MINUTE, limits.apiMax, TRY_LATER);
const apiLimiter = (req, res, next) => (API_LIMIT_EXCLUDED.has(req.originalUrl.split('?')[0]) ? next() : generalApiLimiter(req, res, next));

module.exports = {
  createLimiter,
  createAccountLimiter,
  // Limite geral e generoso para toda a API (protege contra abusos e scraping agressivo).
  apiLimiter,
  loginLimiter: createLimiter(FIFTEEN_MINUTES, limits.loginMax, 'Demasiadas tentativas de login. Tente novamente dentro de alguns minutos.'),
  registerLimiter: createLimiter(ONE_HOUR, limits.registerPerHour, TRY_LATER),
  forgotPasswordLimiter: createLimiter(ONE_HOUR, 5, TRY_LATER),
  resetPasswordLimiter: createLimiter(FIFTEEN_MINUTES, 10, TRY_LATER),
  resendVerificationLimiter: createLimiter(ONE_HOUR, 5, TRY_LATER),
  verifyEmailLimiter: createLimiter(FIFTEEN_MINUTES, 20, TRY_LATER),
  // Quotas por conta.
  orderQuota: createAccountLimiter(ONE_HOUR, limits.ordersPerHour, QUOTA),
  paymentQuota: createAccountLimiter(ONE_HOUR, limits.paymentsPerHour, QUOTA),
  // Só contam os pedidos com ficheiros (multipart/form-data).
  uploadQuota: createAccountLimiter(ONE_HOUR, limits.uploadsPerHour, QUOTA, (req) => !req.is('multipart/form-data')),
  dishWriteQuota: createAccountLimiter(ONE_HOUR, limits.dishWritesPerHour, QUOTA),
  exportQuota: createAccountLimiter(ONE_DAY, limits.exportsPerDay, QUOTA),
  // Apagar a conta pede a password: poucas tentativas por hora.
  deleteAccountQuota: createAccountLimiter(ONE_HOUR, 5, QUOTA),
};
