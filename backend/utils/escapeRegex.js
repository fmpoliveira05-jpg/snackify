/**
 * Escapa os carateres especiais de uma expressão regular, para que o texto pesquisado pelo
 * utilizador seja tratado literalmente (evita pesquisas inválidas e ReDoS).
 *
 * @param {string} text
 * @returns {string}
 */
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = escapeRegex;
