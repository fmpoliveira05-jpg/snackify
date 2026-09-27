/**
 * Conservação limitada dos dados (RGPD, art. 5.º, n.º 1, alínea e)).
 *
 * Corre periodicamente (RETENTION_INTERVAL_MINUTES) dentro do servidor, ou uma vez com
 * `npm run limpeza` (para um cron externo). Todas as operações são idempotentes, por isso não há
 * problema em correrem em várias instâncias ao mesmo tempo.
 *
 *  - contas (clientes e restaurantes) que não confirmaram o email em UNVERIFIED_ACCOUNT_DAYS dias
 *    são apagadas, com as imagens enviadas no registo (o índice TTL apaga-as aos 8 dias se esta
 *    tarefa não correr);
 *  - hashes de tokens de verificação e de recuperação já expirados são removidos;
 *  - o documento de identificação das encomendas pagas no local é removido
 *    IDENTITY_DOC_RETENTION_DAYS dias depois de a encomenda terminar;
 *  - vales nunca pagos (pendentes) são apagados ao fim de PENDING_VOUCHER_DAYS dias.
 */
const { trusted } = require('mongoose');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');
const Voucher = require('../models/voucher');
const { config } = require('../config/env');
const { removeUploads } = require('../utils/uploadFiles');
const { logError } = require('../utils/logger');

const DAY = 24 * 60 * 60 * 1000;

async function deleteUnverified(Model, imageField, cutoff) {
  const stale = await Model.find({ emailVerified: false, createdAt: trusted({ $lt: cutoff }) }).select(imageField).lean();
  if (stale.length === 0) return 0;
  await Model.deleteMany({ _id: trusted({ $in: stale.map((a) => a._id) }), emailVerified: false });
  await removeUploads(stale.map((a) => a[imageField]));
  return stale.length;
}

async function clearExpiredTokens(Model, now) {
  const [verification, reset] = await Promise.all([
    Model.updateMany(
      { emailVerificationExpires: trusted({ $lt: now }) },
      { $unset: { emailVerificationTokenHash: 1, emailVerificationExpires: 1 } },
    ),
    Model.updateMany(
      { passwordResetExpires: trusted({ $lt: now }) },
      { $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 } },
    ),
  ]);
  return verification.modifiedCount + reset.modifiedCount;
}

/**
 * Aplica os prazos de conservação uma vez.
 *
 * @param {Date} [now]
 * @returns {Promise<object>} quantos registos foram apagados ou limpos
 */
async function runRetention(now = new Date()) {
  const { retention } = config;
  const accountsCutoff = new Date(now.getTime() - retention.unverifiedAccountDays * DAY);
  const identityCutoff = new Date(now.getTime() - retention.identityDocDays * DAY);
  const voucherCutoff = new Date(now.getTime() - retention.pendingVoucherDays * DAY);

  const [users, restaurants, userTokens, restaurantTokens, identityDocs, vouchers] = await Promise.all([
    deleteUnverified(User, 'profilePicture', accountsCutoff),
    deleteUnverified(Restaurant, 'logo', accountsCutoff),
    clearExpiredTokens(User, now),
    clearExpiredTokens(Restaurant, now),
    Order.updateMany(
      {
        identityDoc: trusted({ $exists: true }),
        state: trusted({ $in: ['entregue', 'cancelada'] }),
        orderDate: trusted({ $lt: identityCutoff }),
      },
      { $unset: { identityDoc: 1 } },
    ),
    Voucher.deleteMany({ status: 'pending', createdAt: trusted({ $lt: voucherCutoff }) }),
  ]);

  return {
    contasPorConfirmar: users + restaurants,
    tokensExpirados: userTokens + restaurantTokens,
    documentosIdentificacao: identityDocs.modifiedCount,
    valesPendentes: vouchers.deletedCount,
  };
}

/**
 * Arranca a tarefa periódica.
 *
 * @returns {() => void} função que a pára (usada no encerramento ordenado)
 */
function startRetentionJob({ log = console.log } = {}) {
  if (!config.retention.enabled) return () => {};
  const run = async () => {
    try {
      const result = await runRetention();
      const total = Object.values(result).reduce((a, b) => a + b, 0);
      if (total > 0) log(`[retenção] ${JSON.stringify(result)}`);
    } catch (err) {
      logError('[retenção] Falha na limpeza', err);
    }
  };
  const first = setTimeout(run, 60 * 1000);
  const timer = setInterval(run, config.retention.intervalMinutes * 60 * 1000);
  first.unref();
  timer.unref();
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}

module.exports = { runRetention, startRetentionJob };
