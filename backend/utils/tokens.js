/**
 * Tokens de uso único enviados por email (verificação da conta e redefinição da password).
 *
 * Só o hash SHA-256 é guardado na base de dados: quem tiver acesso à base de dados não
 * consegue usar os tokens, e o token em claro só existe no link enviado ao utilizador.
 */
const crypto = require('crypto');

/** @returns {string} hash SHA-256 (hex) do token */
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/**
 * Gera um token aleatório de 256 bits.
 *
 * @param {number} ttlMs validade em milissegundos
 * @returns {{token: string, hash: string, expires: Date}}
 */
const createEmailToken = (ttlMs) => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token), expires: new Date(Date.now() + ttlMs) };
};

/** Um token válido tem exatamente 64 carateres hexadecimais (evita consultas com lixo). */
const isWellFormedToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

module.exports = { hashToken, createEmailToken, isWellFormedToken };
