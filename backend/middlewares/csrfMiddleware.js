/**
 * Proteção contra CSRF pela verificação da origem do pedido.
 *
 * Os pedidos que alteram dados (POST, PUT, PATCH, DELETE) só são aceites se o cabeçalho
 * Origin (ou, na falta dele, o Referer) for um dos endereços da própria aplicação: o
 * cliente Angular (CLIENT_URL) ou o back-office servido pelo Express (SERVER_URL).
 *
 * Um pedido sem Origin nem Referer só passa se não trouxer o cookie da sessão (por
 * exemplo, um cliente de linha de comandos sem sessão). O webhook do Stripe fica de fora:
 * é autenticado pela assinatura do próprio Stripe.
 */
const { config } = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXCLUDED_PATHS = new Set(['/api/stripe/webhook']);

/** Normaliza um URL para a sua origem (esquema + anfitrião + porta), ou null se for inválido. */
const toOrigin = (value) => {
  if (!value || value === 'null') return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const allowedOrigins = () => new Set([toOrigin(config.clientUrl), toOrigin(config.serverUrl)].filter(Boolean));

/** Origem declarada pelo browser: o Origin tem prioridade; o Referer serve de recurso. */
const requestOrigin = (req) => {
  const origin = req.get('origin');
  if (origin) return { present: true, value: toOrigin(origin) };
  const referer = req.get('referer');
  if (referer) return { present: true, value: toOrigin(referer) };
  return { present: false, value: null };
};

const verifyOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method) || EXCLUDED_PATHS.has(req.path)) return next();

  const { present, value } = requestOrigin(req);
  if (present) {
    if (value && allowedOrigins().has(value)) return next();
    return res.status(403).json({ message: 'Origem do pedido não autorizada.' });
  }

  const hasSessionCookie = Boolean(req.cookies?.[config.sessionCookieName]);
  if (hasSessionCookie) {
    return res.status(403).json({ message: 'Origem do pedido não autorizada.' });
  }
  return next();
};

module.exports = { verifyOrigin, allowedOrigins, toOrigin };
