/**
 * Movimentos do saldo dos vales de refeição, sempre atómicos.
 *
 * Antes, o saldo era lido, recalculado e gravado com save(): duas encomendas simultâneas
 * liam o mesmo saldo e ambas o gastavam (o vale pagava duas vezes). Agora o desconto é
 * retirado com $inc numa operação cuja condição exige "saldo >= desconto": se outra
 * encomenda gastou o saldo entretanto, a operação não encontra o vale e nada é retirado.
 */
const { trusted } = require('mongoose');
const Voucher = require('../models/voucher');
const { applyVoucher } = require('./vouchers');

const round = (n) => Math.round(n * 100) / 100;
const MAX_ATTEMPTS = 3;

/**
 * Corrige o erro de arredondamento dos números decimais depois de um $inc (ex.: 1.4499999999)
 * sem apagar outro movimento feito entretanto (só grava se o saldo ainda for o lido).
 */
async function normalizeBalance(voucher) {
  if (!voucher || voucher.balance === round(voucher.balance)) return voucher;
  await Voucher.updateOne({ _id: voucher._id, balance: voucher.balance }, { $set: { balance: round(voucher.balance) } });
  return { ...voucher, balance: round(voucher.balance) };
}

/**
 * Retira do vale (ativo, do cliente) o valor que ele consegue pagar desta encomenda.
 *
 * @param {{code: string, ownerId: *, total: number}} params
 * @returns {Promise<{voucher: object, discount: number}|null>} null se o vale não existir, não tiver
 *          saldo ou o saldo tiver sido gasto por outra encomenda em simultâneo
 */
async function reserveVoucherBalance({ code, ownerId, total }) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const voucher = await Voucher.findOne({ code, ownerId, status: 'active', balance: trusted({ $gt: 0 }) }).lean();
    if (!voucher) return null;
    const { discount } = applyVoucher(voucher.balance, total);
    if (discount <= 0) return null;

    const updated = await Voucher.findOneAndUpdate(
      { _id: voucher._id, status: 'active', balance: trusted({ $gte: discount }) },
      { $inc: { balance: -discount } },
      { new: true, lean: true },
    );
    if (updated) return { voucher: await normalizeBalance(updated), discount };
  }
  return null;
}

/** Devolve ao vale um valor retirado (encomenda cancelada ou que falhou ao ser criada). */
async function refundVoucherBalance(code, amount) {
  if (!code || !(amount > 0)) return null;
  const updated = await Voucher.findOneAndUpdate({ code }, { $inc: { balance: round(amount) } }, { new: true, lean: true });
  return normalizeBalance(updated);
}

module.exports = { reserveVoucherBalance, refundVoucherBalance, normalizeBalance };
