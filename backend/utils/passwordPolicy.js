/**
 * Regra única das passwords, usada no registo, na redefinição, no seed e nas validações.
 *
 * Entre 10 e 64 caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número
 * e um símbolo. O máximo evita pedidos com passwords enormes (o bcrypt só usa 72 bytes).
 */
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,64}$/;
const PASSWORD_MESSAGE = `A password deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres e conter uma letra maiúscula, uma minúscula, um número e um símbolo.`;

/** Custo do bcrypt (2^12 iterações). */
const BCRYPT_COST = 12;

/**
 * @param {unknown} password
 * @returns {boolean} true se a password cumpre a regra
 */
const isStrongPassword = (password) => typeof password === 'string' && PASSWORD_RULE.test(password);

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_RULE,
  PASSWORD_MESSAGE,
  BCRYPT_COST,
  isStrongPassword,
};
