/**
 * Valida um NIF português pelo dígito de controlo.
 *
 * @param {string} nif
 * @returns {boolean}
 */
function nifIsValid(nif) {
  if (!/^\d{9}$/.test(nif)) return false;

  const n = nif.split('').map(Number);
  const checkDigit = n[8];
  const sum = n.slice(0, 8).reduce((acc, digit, i) => acc + digit * (9 - i), 0);
  const mod11 = sum % 11;
  const calculatedDigit = mod11 < 2 ? 0 : 11 - mod11;

  return checkDigit === calculatedDigit;
}

module.exports = nifIsValid;