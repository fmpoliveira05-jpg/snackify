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

/** Número inteiro positivo lido do ambiente, ou o valor por omissão se faltar ou for inválido. */
const int = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

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

  // Tempos máximos (milissegundos). Um pedido, uma consulta ou um serviço externo lento não
  // pode prender recursos indefinidamente.
  timeouts: {
    // Tempo total para receber um pedido (cabeçalhos + corpo).
    request: int(process.env.HTTP_REQUEST_TIMEOUT_MS, 30000),
    // Tempo para receber os cabeçalhos; tem de ser maior do que o keep-alive.
    headers: int(process.env.HTTP_HEADERS_TIMEOUT_MS, 66000),
    // Ligações keep-alive inativas. Atrás de um proxy deve ser maior do que o timeout do proxy.
    keepAlive: int(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 65000),
    // Tempo para terminar os pedidos em curso ao desligar (SIGTERM) antes de fechar à força.
    shutdown: int(process.env.SHUTDOWN_TIMEOUT_MS, 10000),
    mongoServerSelection: int(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000),
    mongoSocket: int(process.env.MONGO_SOCKET_TIMEOUT_MS, 30000),
    // maxTimeMS das consultas mais pesadas (listas e pesquisas).
    query: int(process.env.MONGO_QUERY_MAX_TIME_MS, 5000),
    stripe: int(process.env.STRIPE_TIMEOUT_MS, 10000),
  },
  mongoMaxPoolSize: int(process.env.MONGO_MAX_POOL_SIZE, 20),
  stripeMaxNetworkRetries: int(process.env.STRIPE_MAX_NETWORK_RETRIES, 2),

  // Cache em memória do catálogo público e das consultas à OpenFoodFacts.
  cache: {
    ttlSeconds: int(process.env.CACHE_TTL_SECONDS, 60),
    maxEntries: int(process.env.CACHE_MAX_ENTRIES, 500),
    openFoodFactsTtlSeconds: int(process.env.OFF_CACHE_TTL_SECONDS, 24 * 60 * 60),
  },

  // Limites de pedidos por IP (janela em minutos) e quotas por conta (por hora ou por dia).
  limits: {
    apiWindowMinutes: int(process.env.RATE_LIMIT_API_WINDOW_MINUTES, 15),
    apiMax: int(process.env.RATE_LIMIT_API_MAX, 300),
    loginMax: int(process.env.RATE_LIMIT_LOGIN_MAX, 20),
    registerPerHour: int(process.env.RATE_LIMIT_REGISTER_PER_HOUR, 10),
    ordersPerHour: int(process.env.QUOTA_ORDERS_PER_HOUR, 20),
    paymentsPerHour: int(process.env.QUOTA_PAYMENTS_PER_HOUR, 30),
    uploadsPerHour: int(process.env.QUOTA_UPLOADS_PER_HOUR, 30),
    dishWritesPerHour: int(process.env.QUOTA_DISH_WRITES_PER_HOUR, 60),
    exportsPerDay: int(process.env.QUOTA_EXPORTS_PER_DAY, 5),
  },

  // Tetos de gastos com serviços externos (por instância da aplicação).
  budgets: {
    openFoodFactsPerMinute: int(process.env.OFF_MAX_REQUESTS_PER_MINUTE, 30),
    emailsPerDay: int(process.env.MAIL_MAX_PER_DAY, 300),
    emailsPerAddressPerDay: int(process.env.MAIL_MAX_PER_ADDRESS_PER_DAY, 5),
  },

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

module.exports = { config, assertRequiredConfig, MIN_JWT_SECRET_LENGTH, flag, int };
