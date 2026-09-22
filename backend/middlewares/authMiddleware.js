const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const { config } = require('../config/env');

/** Página inicial de cada tipo de utilizador, usada nos redirecionamentos. */
const HOME_BY_TYPE = {
  restaurant: '/restaurante/dashboard',
  customer: '/cliente/dashboard',
  admin: '/user/perfil',
};

const wantsHtml = (req) => req.accepts(['json', 'html']) === 'html' && !req.xhr;

/**
 * Middleware global: se o pedido trouxer um JWT válido (cookie "token" ou cabeçalho
 * Authorization), carrega o utilizador da base de dados e coloca-o em req.user.
 *
 * Um restaurante só conta como autenticado depois de validado por um administrador,
 * e um restaurante desativado perde o acesso de imediato (o token não chega).
 */
const loadUser = async (req, res, next) => {
  req.user = null;
  res.locals.user = null;

  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return next();

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    res.clearCookie('token');
    return next();
  }

  try {
    const user = decoded.userType === 'restaurant'
      ? await Restaurant.findById(decoded.userId)
      : await User.findById(decoded.userId);

    if (!user || (decoded.userType === 'restaurant' && !user.isChecked)) {
      return next();
    }

    user.userType = decoded.userType;
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
