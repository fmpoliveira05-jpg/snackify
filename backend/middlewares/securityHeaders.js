/**
 * Cabeçalhos de segurança HTTP (helmet + Permissions-Policy) e redirecionamento para HTTPS.
 *
 * A Content-Security-Policy usa um nonce por pedido (res.locals.cspNonce): os poucos scripts
 * inline das páginas EJS levam esse nonce e qualquer outro script inline é bloqueado.
 * Os atributos de evento inline (onclick=, onsubmit=, ...) são proibidos (script-src-attr 'none').
 */
const crypto = require('crypto');
const helmet = require('helmet');
const { config } = require('../config/env');
const { toOrigin } = require('./csrfMiddleware');

/** Gera o nonce da CSP para este pedido. */
const cspNonce = (req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
};

const appOrigins = () => [...new Set([toOrigin(config.clientUrl), toOrigin(config.serverUrl)].filter(Boolean))];

/** Diretivas da CSP (exportadas para os testes). */
const cspDirectives = () => ({
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  // Formulários do back-office e regresso do Stripe Checkout.
  formAction: ["'self'", ...appOrigins(), 'https://checkout.stripe.com'],
  scriptSrc: [
    "'self'",
    (req, res) => `'nonce-${res.locals.cspNonce}'`,
    'https://cdn.jsdelivr.net', // Bootstrap
    'https://www.gstatic.com', // Google Charts
    'https://js.stripe.com',
    'https://challenges.cloudflare.com', // Turnstile
  ],
  scriptSrcAttr: ["'none'"],
  // 'unsafe-inline' só nos estilos: o Angular e o Google Charts aplicam estilos inline.
  styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://www.gstatic.com'],
  fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
  imgSrc: ["'self'", 'data:', 'blob:', ...appOrigins()],
  connectSrc: ["'self'", ...appOrigins(), 'https://www.gstatic.com', 'https://challenges.cloudflare.com'],
  frameSrc: ['https://challenges.cloudflare.com', 'https://js.stripe.com', 'https://checkout.stripe.com'],
  workerSrc: ["'self'", 'blob:'],
  manifestSrc: ["'self'"],
  upgradeInsecureRequests: config.isProduction ? [] : null,
});

/** Funcionalidades do browser que a aplicação não usa ficam desligadas. */
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'camera=()',
  'display-capture=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=(self "https://js.stripe.com")',
  'usb=()',
].join(', ');

const helmetMiddleware = () => helmet({
  contentSecurityPolicy: { useDefaults: false, directives: cspDirectives() },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // O cliente Angular em desenvolvimento (localhost:4200) é "same-site" com a API (localhost:5000).
  crossOriginResourcePolicy: { policy: 'same-site' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  // HSTS só em produção (em desenvolvimento o servidor corre em HTTP).
  strictTransportSecurity: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  xPoweredBy: false,
});

const permissionsPolicy = (req, res, next) => {
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  next();
};

/**
 * Em produção, pedidos em HTTP são redirecionados para HTTPS. Atrás de um proxy, req.secure
 * depende de TRUST_PROXY (lê o X-Forwarded-Proto). O destino usa SERVER_URL e não o cabeçalho
 * Host do pedido, para não permitir redirecionamentos para outros domínios.
 */
const forceHttps = (req, res, next) => {
  if (!config.isProduction || req.secure) return next();
  const target = toOrigin(config.serverUrl);
  if (!target || !target.startsWith('https://')) return next();
  return res.redirect(308, `${target}${req.originalUrl}`);
};

module.exports = {
  cspNonce,
  cspDirectives,
  helmetMiddleware,
  permissionsPolicy,
  forceHttps,
  PERMISSIONS_POLICY,
};
