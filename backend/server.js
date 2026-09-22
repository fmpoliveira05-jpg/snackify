const http = require('http');
const mongoose = require('mongoose');
const { config, assertRequiredConfig } = require('./config/env');
const createApp = require('./app');

async function start() {
  assertRequiredConfig();

  await mongoose.connect(config.mongoUri);
  console.log('Ligado ao MongoDB');

  const server = http.createServer(createApp());
  server.listen(config.port, () => {
    console.log(`Servidor a correr em ${config.serverUrl}`);
    console.log(`Documentação da API em ${config.serverUrl}/api-docs`);
  });
}

start().catch((err) => {
  console.error('Não foi possível arrancar o servidor:', err.message);
  process.exit(1);
});
