/**
 * Aplica uma vez os prazos de conservação dos dados (npm run limpeza). Ver services/retention.js.
 */
const mongoose = require('mongoose');
const { config, assertRequiredConfig } = require('../config/env');
const { runRetention } = require('../services/retention');

(async () => {
  assertRequiredConfig();
  await mongoose.connect(config.mongoUri);
  console.log(JSON.stringify(await runRetention()));
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Falha na limpeza:', err.name);
  process.exit(1);
});
