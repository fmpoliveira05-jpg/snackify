/**
 * Verificações de saúde para monitorização (UptimeRobot, Better Stack, GitHub Actions) e para
 * o orquestrador (Docker, Render, Kubernetes).
 *
 *  - GET /health/live  – o processo está vivo e a responder (não toca na base de dados);
 *  - GET /health/ready – a aplicação consegue servir pedidos: o MongoDB responde ao ping.
 *
 * Não revelam versões, nomes de máquinas, URIs nem mensagens de erro; ficam fora dos limites
 * de pedidos e do redirecionamento para HTTPS (os balanceadores costumam verificar por HTTP).
 */
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const PING_TIMEOUT_MS = 2000;

const noStore = (res) => res.set('Cache-Control', 'no-store');

/** Faz ping ao MongoDB, com um tempo máximo curto. */
async function pingMongo() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
  let timer;
  try {
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(false), PING_TIMEOUT_MS); });
    const ping = mongoose.connection.db.admin().ping().then((r) => r?.ok === 1).catch(() => false);
    return await Promise.race([ping, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

router.get('/health/live', (req, res) => {
  noStore(res).json({ status: 'ok' });
});

router.get('/health/ready', async (req, res) => {
  const mongo = await pingMongo();
  noStore(res).status(mongo ? 200 : 503).json({ status: mongo ? 'ok' : 'indisponivel', checks: { mongo: mongo ? 'ok' : 'falhou' } });
});

module.exports = router;
module.exports.pingMongo = pingMongo;
