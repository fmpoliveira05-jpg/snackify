const express = require('express');
const { config } = require('../config/env');
const payments = require('../services/payments');

const router = express.Router();

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     summary: Webhook do Stripe (checkout.session.completed) para confirmar encomendas e vales pagos
 *     tags: [Cliente]
 *     description: >
 *       Só aceita eventos assinados pelo Stripe (cabeçalho Stripe-Signature, verificado com
 *       STRIPE_WEBHOOK_SECRET). Tem de receber o corpo em bruto, por isso é montado antes do express.json.
 *     responses:
 *       200:
 *         description: Evento recebido.
 *       400:
 *         description: Assinatura inválida.
 *       503:
 *         description: Stripe ou webhook não configurados.
 */
router.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    const stripe = payments.getStripe();
    if (!stripe || !config.stripeWebhookSecret) {
      return res.status(503).json({ message: 'Webhook do Stripe não configurado.' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature') || '', config.stripeWebhookSecret);
    } catch (err) {
      return res.status(400).json({ message: 'Assinatura inválida.' });
    }

    try {
      await payments.handleStripeEvent(event);
    } catch (err) {
      // 500 faz o Stripe repetir o envio mais tarde; o tratamento é idempotente.
      console.error(`[stripe] Erro ao tratar o evento ${event.id}:`, err.name);
      return res.status(500).json({ message: 'Erro ao tratar o evento.' });
    }
    return res.json({ received: true });
  },
);

module.exports = router;
