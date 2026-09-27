const http = require('http');
const mongoose = require('mongoose');
const { config, assertRequiredConfig } = require('./config/env');
const createApp = require('./app');

/**
 * Opções da ligação ao MongoDB: sem servidor disponível, os pedidos falham ao fim de poucos
 * segundos (em vez de ficarem pendurados), e o número de ligações é limitado.
 */
const mongoOptions = () => ({
  serverSelectionTimeoutMS: config.timeouts.mongoServerSelection,
  socketTimeoutMS: config.timeouts.mongoSocket,
  maxPoolSize: config.mongoMaxPoolSize,
});

/**
 * Tempos máximos do servidor HTTP (proteção contra ligações lentas, "slowloris").
 *
 * @param {http.Server} server
 */
function applyServerTimeouts(server) {
  server.requestTimeout = config.timeouts.request;
  server.keepAliveTimeout = config.timeouts.keepAlive;
  // O Node exige headersTimeout > keepAliveTimeout para não cortar ligações reutilizadas.
  server.headersTimeout = Math.max(config.timeouts.headers, config.timeouts.keepAlive + 1000);
  return server;
}

/**
 * Cria a função que desliga a aplicação de forma ordenada (SIGTERM/SIGINT):
 * deixa de aceitar ligações, espera pelos pedidos em curso (até ao limite), pára as tarefas
 * periódicas e fecha a ligação ao MongoDB.
 *
 * @param {http.Server} server
 * @param {{stopJobs?: Function, exit?: Function, log?: Function}} [options]
 * @returns {(signal: string) => Promise<void>}
 */
function createShutdown(server, { stopJobs = () => {}, exit = process.exit, log = console.log } = {}) {
  let shuttingDown = false;
  return async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${signal} recebido: a terminar os pedidos em curso...`);

    const force = setTimeout(() => {
      log('Tempo de encerramento esgotado: a fechar as ligações à força.');
      server.closeAllConnections?.();
      exit(1);
    }, config.timeouts.shutdown);
    force.unref();

    try {
      stopJobs();
      await new Promise((resolve) => {
        server.close(() => resolve());
        // Ligações keep-alive sem pedidos não precisam de esperar.
        server.closeIdleConnections?.();
      });
      await mongoose.disconnect();
      clearTimeout(force);
      log('Servidor terminado.');
      exit(0);
    } catch (err) {
      log(`Erro ao terminar: ${err.name}`);
      exit(1);
    }
  };
}

/**
 * Liga-se ao MongoDB e arranca o servidor HTTP.
 */
async function start() {
  assertRequiredConfig();

  await mongoose.connect(config.mongoUri, mongoOptions());
  console.log('Ligado ao MongoDB');

  const server = applyServerTimeouts(http.createServer(createApp()));
  server.listen(config.port, () => {
    console.log(`Servidor a correr em ${config.serverUrl}`);
    if (config.enableApiDocs) console.log(`Documentação da API em ${config.serverUrl}/api-docs`);
  });

  const shutdown = createShutdown(server);
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Não foi possível arrancar o servidor:', err.message);
    process.exit(1);
  });
}

module.exports = { start, mongoOptions, applyServerTimeouts, createShutdown };
