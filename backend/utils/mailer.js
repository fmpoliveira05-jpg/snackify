/**
 * Envio de emails por SMTP (nodemailer), configurado pelas variáveis SMTP_* e MAIL_FROM.
 *
 * Sem SMTP configurado:
 *  - fora de produção, o email (com o link) é escrito na consola, para se poder testar;
 *  - em produção, o envio falha com um erro que NÃO inclui o conteúdo (o link tem um token secreto).
 */
const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const WindowBudget = require('./budget');

const ONE_DAY = 24 * 60 * 60 * 1000;
/** Tetos de envio: total por dia (MAIL_MAX_PER_DAY) e por destinatário (MAIL_MAX_PER_ADDRESS_PER_DAY). */
const dailyBudget = new WindowBudget({ limit: config.budgets.emailsPerDay, windowMs: ONE_DAY });
const perAddressBudget = new WindowBudget({ limit: config.budgets.emailsPerAddressPerDay, windowMs: ONE_DAY });

/** Erro de envio recusado pelo teto diário (a mensagem não tem o destinatário). */
class EmailBudgetError extends Error {
  constructor() {
    super('Limite diário de emails atingido: o email não foi enviado.');
    this.name = 'EmailBudgetError';
  }
}

let transporter = null;

/** Cria o transporte SMTP uma única vez. */
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      // Nunca aceitar certificados inválidos nem ligações sem TLS quando o servidor o suporta.
      requireTLS: !config.smtp.secure && config.isProduction,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return transporter;
};

/** Permite aos testes substituir o transporte. */
const setTransporter = (custom) => {
  transporter = custom;
};

const isConfigured = () => Boolean(config.smtp.host);

/**
 * Envia um email.
 *
 * @param {{to: string, subject: string, text: string, html?: string}} message
 */
async function sendMail({ to, subject, text, html }) {
  if (!isConfigured() && !transporter) {
    if (config.isProduction) {
      throw new Error('SMTP não configurado: não foi possível enviar o email.');
    }
    if (!config.isTest) {
      console.log(`\n[email de desenvolvimento] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
    }
    return { simulated: true };
  }
  const address = String(to).trim().toLowerCase();
  if (perAddressBudget.remaining(address) <= 0 || !dailyBudget.tryConsume()) {
    throw new EmailBudgetError();
  }
  perAddressBudget.tryConsume(address);
  return getTransporter().sendMail({ from: config.mailFrom, to, subject, text, html });
}

/** Escapa texto para ser incluído no HTML do email. */
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

/** Email com o link de confirmação da conta. */
const sendVerificationEmail = (to, name, link) => sendMail({
  to,
  subject: 'Snackify: confirme o seu email',
  text: `Olá ${name},\n\nPara ativar a sua conta Snackify, abra este link (válido durante 24 horas):\n${link}\n\nSe não criou esta conta, ignore este email.`,
  html: `<p>Olá ${escapeHtml(name)},</p><p>Para ativar a sua conta Snackify, abra este link (válido durante 24 horas):</p><p><a href="${escapeHtml(link)}">Confirmar email</a></p><p>Se não criou esta conta, ignore este email.</p>`,
});

/** Email com o link de redefinição da password. */
const sendPasswordResetEmail = (to, name, link) => sendMail({
  to,
  subject: 'Snackify: redefinir a password',
  text: `Olá ${name},\n\nPara escolher uma nova password, abra este link (válido durante 30 minutos e só uma vez):\n${link}\n\nSe não pediu esta alteração, ignore este email: a sua password continua a mesma.`,
  html: `<p>Olá ${escapeHtml(name)},</p><p>Para escolher uma nova password, abra este link (válido durante 30 minutos e só uma vez):</p><p><a href="${escapeHtml(link)}">Redefinir password</a></p><p>Se não pediu esta alteração, ignore este email: a sua password continua a mesma.</p>`,
});

module.exports = {
  sendMail, sendVerificationEmail, sendPasswordResetEmail, setTransporter, isConfigured, EmailBudgetError, dailyBudget, perAddressBudget,
};
