const bcrypt = require('bcryptjs');
const { trusted } = require('mongoose');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const { config } = require('../config/env');
const { wrapAll } = require('../utils/asyncHandler');
const { logError } = require('../utils/logger');
const { HOME_BY_TYPE } = require('../middlewares/authMiddleware');
const { startSession, endSession } = require('../services/session');
const { createEmailToken, hashToken, isWellFormedToken } = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { BCRYPT_COST, PASSWORD_MESSAGE, isStrongPassword } = require('../utils/passwordPolicy');

// Mensagem única para qualquer falha de login: não revela se a conta existe nem se está bloqueada.
const INVALID_CREDENTIALS = 'Credenciais inválidas.';
const EMAIL_NOT_VERIFIED = 'Confirme o seu email antes de iniciar sessão. Pode pedir um novo link na página de login.';
const GENERIC_EMAIL_SENT = 'Se existir uma conta associada a esse email, vai receber uma mensagem com as instruções.';
const INVALID_LINK = 'O link é inválido ou já expirou.';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

// Hash de uma password aleatória: comparar com ele quando a conta não existe faz com que a
// resposta demore o mesmo tempo, e o tempo deixa de revelar que usernames existem.
const DUMMY_PASSWORD_HASH = '$2b$12$IRUEajE9QCWNByJ6.DfR3OE4aPVBQy4PJvVN59ZFf0YIZF2/Ts6Qi';

const LOGIN_FIELDS = '+password +failedLoginAttempts +lockUntil +tokenVersion';

/**
 * Procura uma conta primeiro nos clientes/administradores e depois nos restaurantes.
 *
 * @returns {Promise<{account: object|null, Model: import('mongoose').Model, userType: string|null}>}
 */
async function findAccount(filter, fields) {
  const user = await User.findOne(filter).select(fields);
  if (user) return { account: user, Model: User, userType: user.userType || 'customer' };
  const restaurant = await Restaurant.findOne(filter).select(fields);
  if (restaurant) return { account: restaurant, Model: Restaurant, userType: 'restaurant' };
  return { account: null, Model: null, userType: null };
}

/** Texto não vazio e com um tamanho razoável (rejeita objetos, listas e valores enormes). */
const isText = (value, max = 254) => typeof value === 'string' && value.length > 0 && value.length <= max;

const verificationLink = (token) => `${config.clientUrl}/verificar-email?token=${token}`;
const resetLink = (token) => `${config.clientUrl}/redefinir-password?token=${token}`;

/**
 * Gera um novo token de verificação para a conta, guarda o hash e envia o email.
 * Falhas no envio são registadas sem o token (o link é secreto) e não interrompem o pedido.
 *
 * @param {import('mongoose').Model} Model User ou Restaurant
 */
async function issueEmailVerification(Model, account) {
  const { token, hash, expires } = createEmailToken(EMAIL_VERIFICATION_TTL_MS);
  await Model.updateOne(
    { _id: account._id },
    { $set: { emailVerificationTokenHash: hash, emailVerificationExpires: expires } },
  );
  try {
    await sendVerificationEmail(account.email, account.name, verificationLink(token));
  } catch (err) {
    logError(`[email] Não foi possível enviar a verificação da conta ${account._id}`, err);
  }
}

/**
 * Regista uma tentativa de login falhada; à 5.ª seguida, bloqueia a conta durante 15 minutos.
 */
async function registerFailedLogin(Model, account) {
  const updated = await Model.findOneAndUpdate(
    { _id: account._id },
    { $inc: { failedLoginAttempts: 1 } },
    { new: true, projection: { failedLoginAttempts: 1 } },
  );
  if ((updated?.failedLoginAttempts || 0) >= MAX_FAILED_ATTEMPTS) {
    await Model.updateOne(
      { _id: account._id },
      { $set: { lockUntil: new Date(Date.now() + LOCK_TIME_MS), failedLoginAttempts: 0 } },
    );
  }
}

/**
 * GET /auth/me — dados da conta autenticada (usado pelo Angular para saber quem está ligado).
 */
const getMe = async (req, res) => {
  // req.user foi carregado pelo loadUser; os campos sensíveis são removidos no toJSON do modelo.
  const data = typeof req.user.toJSON === 'function' ? req.user.toJSON() : { ...req.user };
  res.json({ ...data, userType: req.user.userType });
};

/**
 * POST /auth/login — valida as credenciais e cria a sessão (o token só vai no cookie httpOnly).
 */
const login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!isText(username, 50) || !isText(password, 128)) {
    return res.status(400).json({ message: 'Indique o username e a password.' });
  }

  const { account, Model, userType } = await findAccount({ username }, LOGIN_FIELDS);

  if (!account) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return res.status(401).json({ message: INVALID_CREDENTIALS });
  }

  const isLocked = account.lockUntil && account.lockUntil.getTime() > Date.now();
  const passwordMatches = await bcrypt.compare(password, isLocked ? DUMMY_PASSWORD_HASH : account.password);
  if (isLocked) {
    return res.status(401).json({ message: INVALID_CREDENTIALS });
  }
  if (!passwordMatches) {
    await registerFailedLogin(Model, account);
    return res.status(401).json({ message: INVALID_CREDENTIALS });
  }

  // Só quem sabe a password chega aqui, por isso estas mensagens já não revelam nada a terceiros.
  if (account.emailVerified !== true) {
    return res.status(403).json({ message: EMAIL_NOT_VERIFIED, code: 'EMAIL_NOT_VERIFIED' });
  }
  if (userType === 'restaurant' && !account.isChecked) {
    return res.status(403).json({ message: 'O restaurante ainda não foi validado por um administrador.' });
  }

  if (account.failedLoginAttempts || account.lockUntil) {
    await Model.updateOne({ _id: account._id }, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  startSession(res, account, userType);
  return res.json({ message: 'Login bem-sucedido!', userType });
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
  endSession(res);
  res.status(200).json({ message: 'Sessão terminada.' });
};

/**
 * POST /auth/logout-all — invalida todas as sessões da conta (em todos os dispositivos).
 */
const logoutAll = async (req, res) => {
  const Model = req.user.userType === 'restaurant' ? Restaurant : User;
  await Model.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  endSession(res);
  res.json({ message: 'Todas as sessões foram terminadas.' });
};

/**
 * GET/POST /auth/verify-email — confirma o email a partir do token recebido por email.
 * O token é de uso único: é apagado assim que é usado.
 */
const verifyEmail = async (req, res) => {
  const token = req.body?.token ?? req.query?.token;
  if (!isWellFormedToken(token)) {
    return res.status(400).json({ message: INVALID_LINK });
  }

  const filter = { emailVerificationTokenHash: hashToken(token), emailVerificationExpires: trusted({ $gt: new Date() }) };
  const update = { $set: { emailVerified: true }, $unset: { emailVerificationTokenHash: 1, emailVerificationExpires: 1 } };
  // O operador $gt é construído aqui (não vem do pedido), por isso é marcado como confiável.
  const options = { new: true };

  const verified = await User.findOneAndUpdate(filter, update, options)
    || await Restaurant.findOneAndUpdate(filter, update, options);
  if (!verified) {
    return res.status(400).json({ message: INVALID_LINK });
  }
  return res.json({ message: 'Email confirmado. Já pode iniciar sessão.' });
};

/**
 * POST /auth/resend-verification — envia um novo link de confirmação.
 * A resposta é sempre a mesma, exista ou não a conta (não permite descobrir emails registados).
 */
const resendVerification = async (req, res) => {
  const { email } = req.body || {};
  if (isText(email)) {
    const { account, Model } = await findAccount({ email, emailVerified: false }, 'email name');
    if (account) await issueEmailVerification(Model, account);
  }
  res.json({ message: GENERIC_EMAIL_SENT });
};

/**
 * POST /auth/forgot-password — envia um link para redefinir a password (válido 30 minutos).
 * A resposta é sempre a mesma, exista ou não a conta.
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body || {};
  if (isText(email)) {
    const { account, Model } = await findAccount({ email }, 'email name');
    if (account) {
      const { token, hash, expires } = createEmailToken(PASSWORD_RESET_TTL_MS);
      await Model.updateOne(
        { _id: account._id },
        { $set: { passwordResetTokenHash: hash, passwordResetExpires: expires } },
      );
      try {
        await sendPasswordResetEmail(account.email, account.name, resetLink(token));
      } catch (err) {
        logError(`[email] Não foi possível enviar a recuperação da conta ${account._id}`, err);
      }
    }
  }
  res.json({ message: GENERIC_EMAIL_SENT });
};

/**
 * POST /auth/reset-password — define a nova password com o token recebido por email.
 *
 * O token é de uso único; a versão da sessão sobe (todas as sessões abertas deixam de valer),
 * o bloqueio por tentativas falhadas é levantado e o email fica confirmado (quem recebeu o link
 * provou que controla a caixa de correio).
 */
const resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (!isWellFormedToken(token)) {
    return res.status(400).json({ message: INVALID_LINK });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: PASSWORD_MESSAGE });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const filter = { passwordResetTokenHash: hashToken(token), passwordResetExpires: trusted({ $gt: new Date() }) };
  const update = {
    $set: { password: passwordHash, failedLoginAttempts: 0, emailVerified: true },
    $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1, lockUntil: 1 },
    $inc: { tokenVersion: 1 },
  };
  const options = { new: true };

  const updated = await User.findOneAndUpdate(filter, update, options)
    || await Restaurant.findOneAndUpdate(filter, update, options);
  if (!updated) {
    return res.status(400).json({ message: INVALID_LINK });
  }

  endSession(res);
  return res.json({ message: 'Password alterada. Inicie sessão com a nova password.' });
};

module.exports = wrapAll({
  getMe,
  login,
  logout,
  logoutAll,
  showLoginPage,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
});
module.exports.issueEmailVerification = issueEmailVerification;
module.exports.INVALID_CREDENTIALS = INVALID_CREDENTIALS;
module.exports.MAX_FAILED_ATTEMPTS = MAX_FAILED_ATTEMPTS;
module.exports.DUMMY_PASSWORD_HASH = DUMMY_PASSWORD_HASH;
