const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const { config } = require('../config/env');
const { wrapAll } = require('../utils/asyncHandler');
const { HOME_BY_TYPE } = require('../middlewares/authMiddleware');

const TOKEN_MAX_AGE_MS = 60 * 60 * 1000;
// Mensagem única para utilizador inexistente ou password errada: não revela que contas existem.
const INVALID_CREDENTIALS = 'Username ou password incorretos.';

/**
 * GET /auth/me — dados da conta autenticada (usado pelo Angular para saber quem está ligado).
 */
const getMe = async (req, res) => {
  // req.user foi carregado pelo loadUser; a password nunca é selecionada (select: false no modelo).
  res.json(req.user);
};

/**
 * POST /auth/login — valida as credenciais e devolve o token JWT (também guardado num cookie httpOnly).
 */
const login = async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ message: 'Indique o username e a password.' });
  }

  let account = await User.findOne({ username }).select('+password');
  let userType = account?.userType;
  if (!account) {
    account = await Restaurant.findOne({ username }).select('+password');
    userType = 'restaurant';
  }

  if (!account || !(await bcrypt.compare(password, account.password))) {
    return res.status(401).json({ message: INVALID_CREDENTIALS });
  }
  if (userType === 'restaurant' && !account.isChecked) {
    return res.status(403).json({ message: 'O restaurante ainda não foi validado por um administrador.' });
  }

  const token = jwt.sign({ userId: account._id, userType }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  res.cookie('token', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE_MS,
  });

  return res.json({ message: 'Login bem-sucedido!', token, userType });
};

/**
 * GET /auth/login — página de login do back-office (EJS).
 */
const showLoginPage = (req, res) => {
  if (req.user) {
    return res.redirect(HOME_BY_TYPE[req.user.userType] || '/');
  }
  return res.redirect(`${config.clientUrl}/login`);
};

/**
 * POST /auth/logout — apaga o cookie da sessão.
 */
const logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Sessão terminada.' });
};

module.exports = wrapAll({
  getMe,
  login,
  logout,
  showLoginPage,
});
