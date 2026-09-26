/**
 * Sessão: JWT assinado com HS256, guardado apenas num cookie httpOnly.
 *
 * O token nunca é devolvido no corpo das respostas nem aceite no cabeçalho Authorization,
 * por isso um script injetado na página não o consegue ler nem reutilizar noutro sítio.
 * A claim "tv" (versão do token) tem de coincidir com a versão guardada na conta: ao
 * redefinir a password ou terminar todas as sessões, a versão sobe e os tokens antigos deixam de valer.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

const JWT_ALGORITHM = 'HS256';

/** Opções do cookie da sessão (as mesmas ao criar e ao apagar, senão o browser não o apaga). */
const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict',
  path: '/',
});

/**
 * Assina um JWT para a conta indicada.
 *
 * @param {{_id: any, tokenVersion?: number}} account
 * @param {string} userType customer | admin | restaurant
 * @returns {string}
 */
const signSessionToken = (account, userType) => jwt.sign(
  { userId: String(account._id), userType, tv: account.tokenVersion || 0 },
  config.jwtSecret,
  {
    algorithm: JWT_ALGORITHM,
    expiresIn: config.jwtExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    jwtid: crypto.randomUUID(),
  },
);

/**
 * Valida a assinatura, o algoritmo, o emissor, o público e a validade de um token.
 *
 * @param {string} token
 * @returns {object} claims decodificadas
 * @throws se o token for inválido
 */
const verifySessionToken = (token) => jwt.verify(token, config.jwtSecret, {
  algorithms: [JWT_ALGORITHM],
  issuer: config.jwtIssuer,
  audience: config.jwtAudience,
});

/**
 * Cria a sessão: assina o token e guarda-o no cookie, com a mesma validade do JWT.
 */
const startSession = (res, account, userType) => {
  const token = signSessionToken(account, userType);
  const { exp } = jwt.decode(token);
  res.cookie(config.sessionCookieName, token, {
    ...cookieOptions(),
    maxAge: Math.max(0, exp * 1000 - Date.now()),
  });
  return token;
};

/** Apaga o cookie da sessão. */
const endSession = (res) => {
  res.clearCookie(config.sessionCookieName, cookieOptions());
};

/** Token da sessão enviado pelo browser (só o cookie conta). */
const readSessionToken = (req) => req.cookies?.[config.sessionCookieName] || null;

module.exports = {
  JWT_ALGORITHM,
  cookieOptions,
  signSessionToken,
  verifySessionToken,
  startSession,
  endSession,
  readSessionToken,
};
