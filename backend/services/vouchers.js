/**
 * Regras dos vales de refeição (funções puras).
 */
const crypto = require('crypto');

/** Valores que é possível comprar, em euros. */
const VOUCHER_VALUES = [5, 10, 20, 50];

/** @returns {string} código aleatório, fácil de ditar (ex.: VALE-7F3K9Q) */
function generateVoucherCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `VALE-${code}`;
}

/**
 * Calcula quanto de um vale se usa numa encomenda.
 *
 * @param {number} balance saldo do vale
 * @param {number} total total da encomenda
 * @returns {{discount: number, remainingBalance: number, toPay: number}} valores arredondados ao cêntimo
 */
function applyVoucher(balance, total) {
  const round = (n) => Math.round(n * 100) / 100;
  const discount = round(Math.max(0, Math.min(balance, total)));
  return { discount, remainingBalance: round(balance - discount), toPay: round(total - discount) };
}

module.exports = { VOUCHER_VALUES, generateVoucherCode, applyVoucher };
