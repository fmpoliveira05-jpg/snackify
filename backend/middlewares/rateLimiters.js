/**
 * Limites de pedidos por endereço IP (express-rate-limit).
 *
 * O IP vem de req.ip, que só é fiável com TRUST_PROXY configurado corretamente quando a
 * aplicação está atrás de um proxy (Nginx, Cloudflare, Render, ...).
 * Nos testes os limites estão desligados por omissão (RATE_LIMIT_ENABLED=true liga-os).
 */
const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/**
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

const TRY_LATER = 'Demasiados pedidos. Tente novamente dentro de alguns minutos.';

module.exports = {
  createLimiter,
  // Limite geral e generoso para toda a API (protege contra abusos e scraping agressivo).
  apiLimiter: createLimiter(FIFTEEN_MINUTES, 300, TRY_LATER),
  loginLimiter: createLimiter(FIFTEEN_MINUTES, 20, 'Demasiadas tentativas de login. Tente novamente dentro de alguns minutos.'),
  registerLimiter: createLimiter(ONE_HOUR, 10, TRY_LATER),
  forgotPasswordLimiter: createLimiter(ONE_HOUR, 5, TRY_LATER),
  resetPasswordLimiter: createLimiter(FIFTEEN_MINUTES, 10, TRY_LATER),
  resendVerificationLimiter: createLimiter(ONE_HOUR, 5, TRY_LATER),
  verifyEmailLimiter: createLimiter(FIFTEEN_MINUTES, 20, TRY_LATER),
};
