const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const { config } = require('../config/env');
const { readSessionToken, verifySessionToken, endSession } = require('../services/session');

/** Página inicial de cada tipo de utilizador, usada nos redirecionamentos. */
const HOME_BY_TYPE = {
  restaurant: '/restaurante/dashboard',
  customer: '/cliente/dashboard',
  admin: '/user/perfil',
};

/**
 * Indica se o pedido veio de uma página do back-office (e não da API), para decidir entre redirecionar e responder em JSON.
 */
const wantsHtml = (req) => req.accepts(['json', 'html']) === 'html' && !req.xhr;

/**
 * Middleware global: se o pedido trouxer um JWT válido no cookie da sessão, carrega o
 * utilizador da base de dados e coloca-o em req.user.
 *
 * O cabeçalho Authorization deixou de ser aceite: a sessão vive só no cookie httpOnly.
 * O token tem de ter sido assinado com HS256, pelo emissor e para o público esperados, e a
 * sua versão ("tv") tem de coincidir com a da conta (senão foi revogado).
 *
 * Um restaurante só conta como autenticado depois de validado por um administrador,
 * e um restaurante desativado perde o acesso de imediato (o token não chega).
 */
const loadUser = async (req, res, next) => {
  req.user = null;
  res.locals.user = null;

  const token = readSessionToken(req);
  if (!token) return next();

  let decoded;
  try {
    decoded = verifySessionToken(token);
  } catch (err) {
    endSession(res);
    return next();
  }

  try {
    const Model = decoded.userType === 'restaurant' ? Restaurant : User;
    const user = await Model.findById(decoded.userId).select('+tokenVersion');

    if (!user || (decoded.userType === 'restaurant' && !user.isChecked)) {
      return next();
    }
    if ((user.tokenVersion || 0) !== decoded.tv) {
      // Sessão revogada (password redefinida ou "terminar todas as sessões").
      endSession(res);
      return next();
    }

    // Nos clientes/administradores manda o tipo guardado na base de dados (uma despromoção vale logo).
    user.userType = decoded.userType === 'restaurant' ? 'restaurant' : (user.userType || decoded.userType);
    req.user = user;
    res.locals.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Exige um utilizador autenticado: 401 para pedidos à API, redirecionamento para o login
 * quando é o browser a pedir uma página.
 */
const requireAuth = (req, res, next) => {
  if (req.user) return next();
  if (wantsHtml(req)) return res.redirect(`${config.clientUrl}/login`);
  return res.status(401).json({ message: 'É necessário iniciar sessão.' });
};

/**
 * Nas páginas de login e registo, quem já tem sessão é enviado para a sua página inicial.
 */
const redirectIfAuthenticated = (req, res, next) => {
  if (!req.user) return next();
  if (wantsHtml(req)) return res.redirect(HOME_BY_TYPE[req.user.userType] || '/');
  return res.status(403).json({ message: 'Já tem sessão iniciada.' });
};

// Nas rotas, "auth" continua a ser o middleware que exige sessão.
module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.loadUser = loadUser;
module.exports.redirectIfAuthenticated = redirectIfAuthenticated;
module.exports.HOME_BY_TYPE = HOME_BY_TYPE;
