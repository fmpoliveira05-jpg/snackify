/**
 * Configuração da aplicação lida das variáveis de ambiente (ficheiro .env em desenvolvimento).
 *
 * Centralizar a leitura aqui permite falhar logo no arranque, com uma mensagem clara,
 * em vez de rebentar mais tarde num pedido qualquer (por exemplo, ao assinar um JWT).
 */
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';
const isProduction = env === 'production';

/** Tamanho mínimo do segredo dos JWT em produção (HS256 precisa de, pelo menos, 256 bits). */
const MIN_JWT_SECRET_LENGTH = 32;

const port = Number(process.env.PORT) || 5000;

/** Interpreta "true"/"1"/"sim" como verdadeiro; tudo o resto é falso. */
const flag = (value) => ['true', '1', 'sim', 'yes'].includes(String(value || '').trim().toLowerCase());

const config = {
  env,
  isTest,
  isProduction,
  port,
  mongoUri: process.env.MONGODB_URI,

  // Sessão (JWT guardado apenas num cookie httpOnly)
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'segredo-apenas-para-testes-com-32-caracteres!' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtIssuer: process.env.JWT_ISSUER || 'snackify-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'snackify-web',
  // Em produção o prefixo __Host- obriga o browser a exigir Secure, Path=/ e nenhum Domain.
  sessionCookieName: isProduction ? '__Host-snackify' : 'token',

  clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
  serverUrl: process.env.SERVER_URL || `http://localhost:${port}`,

  // Número de proxies de confiança à frente da aplicação (0 = ligação direta).
  trustProxy: Number(process.env.TRUST_PROXY || 0),

  // Pagamentos
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || null,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
  // Compra simulada de vales: nunca disponível em produção, mesmo que a variável esteja ligada.
  allowSimulatedPayments: !isProduction && flag(process.env.ALLOW_SIMULATED_PAYMENTS),

  // Email (verificação de conta e recuperação da password)
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: flag(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || 'Snackify <no-reply@snackify.local>',

  // Proteção contra bots (Cloudflare Turnstile): desligada quando a chave está vazia.
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
  // Chave pública do widget, usada nos formulários EJS do back-office.
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',

  // Limites de pedidos: ligados por omissão, desligados nos testes (salvo indicação em contrário).
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED
    ? flag(process.env.RATE_LIMIT_ENABLED)
    : !isTest,

  // Documentação Swagger: pública só fora de produção, salvo se for ativada explicitamente.
  enableApiDocs: !isProduction || flag(process.env.ENABLE_API_DOCS),
};

/**
 * Garante que as variáveis obrigatórias existem e são seguras. Chamado pelo server.js antes de arrancar.
 */
function assertRequiredConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length > 0) {
    throw new Error(`Faltam variáveis de ambiente obrigatórias: ${missing.join(', ')}. Veja o ficheiro .env.example.`);
  }
  if (config.isProduction && config.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`Em produção, JWT_SECRET tem de ter pelo menos ${MIN_JWT_SECRET_LENGTH} caracteres.`);
  }
  if (config.isProduction && !config.smtp.host) {
    console.warn('[aviso] SMTP_HOST não está definido: os emails de verificação e recuperação não serão enviados.');
  }
  if (config.stripeSecretKey && !config.stripeWebhookSecret) {
    console.warn('[aviso] STRIPE_WEBHOOK_SECRET não está definido: os pagamentos só são confirmados no regresso do Stripe.');
  }
}

module.exports = { config, assertRequiredConfig, MIN_JWT_SECRET_LENGTH };
