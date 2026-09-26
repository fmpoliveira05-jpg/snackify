/**
 * Proteção contra bots nos formulários públicos (registo, login e recuperação da password).
 *
 *  - Honeypot: um campo escondido ("website") que uma pessoa nunca preenche. Se vier
 *    preenchido, o pedido é descartado com uma resposta genérica, sem fazer nada.
 *  - Cloudflare Turnstile: o token do desafio é validado junto da Cloudflare. Fica desligado
 *    quando TURNSTILE_SECRET_KEY está vazio (desenvolvimento e testes).
 */
const axios = require('axios');
const { config } = require('../config/env');
const { discardUpload } = require('./uploadMiddleware');

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const HONEYPOT_FIELD = 'website';

/**
 * Descarta pedidos com o campo honeypot preenchido.
 *
 * @param {string} genericMessage resposta 200 igual à de um pedido normal (ex.: recuperação da password)
 *   ou null para responder 400 "Pedido inválido."
 */
const honeypot = (genericMessage = null) => async (req, res, next) => {
  const trap = req.body?.[HONEYPOT_FIELD];
  if (trap === undefined || trap === null || trap === '') return next();
  await discardUpload(req);
  if (genericMessage) return res.status(200).json({ message: genericMessage });
  return res.status(400).json({ message: 'Pedido inválido.' });
};

/**
 * Pergunta à Cloudflare se o token do Turnstile é válido.
 *
 * @returns {Promise<boolean>}
 */
async function verifyTurnstileToken(token, remoteip) {
  const params = new URLSearchParams({ secret: config.turnstileSecretKey, response: token });
  if (remoteip) params.append('remoteip', remoteip);
  const { data } = await axios.post(TURNSTILE_VERIFY_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 5000,
    maxContentLength: 64 * 1024,
  });
  return data?.success === true;
}

/** Exige um desafio Turnstile válido (só quando TURNSTILE_SECRET_KEY está configurada). */
const turnstile = async (req, res, next) => {
  if (!config.turnstileSecretKey) return next();

  const token = req.body?.['cf-turnstile-response'] || req.body?.turnstileToken;
  if (typeof token !== 'string' || !token || token.length > 2048) {
    await discardUpload(req);
    return res.status(400).json({ message: 'Confirme que não é um robô e tente novamente.' });
  }

  try {
    if (await verifyTurnstileToken(token, req.ip)) return next();
  } catch (err) {
    console.error('[turnstile] Falha ao contactar a Cloudflare:', err.code || err.name);
  }
  await discardUpload(req);
  return res.status(400).json({ message: 'Confirme que não é um robô e tente novamente.' });
};

module.exports = { honeypot, turnstile, verifyTurnstileToken, HONEYPOT_FIELD, TURNSTILE_VERIFY_URL };
