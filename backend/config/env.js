/**
 * Configuração da aplicação lida das variáveis de ambiente (ficheiro .env em desenvolvimento).
 *
 * Centralizar a leitura aqui permite falhar logo no arranque, com uma mensagem clara,
 * em vez de rebentar mais tarde num pedido qualquer (por exemplo, ao assinar um JWT).
 */
require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'segredo-apenas-para-testes' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
  serverUrl: process.env.SERVER_URL || `http://localhost:${Number(process.env.PORT) || 5000}`,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || null,
};

/**
 * Garante que as variáveis obrigatórias existem. Chamado pelo server.js antes de arrancar.
 */
function assertRequiredConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length > 0) {
    throw new Error(`Faltam variáveis de ambiente obrigatórias: ${missing.join(', ')}. Veja o ficheiro .env.example.`);
  }
}

module.exports = { config, assertRequiredConfig };
