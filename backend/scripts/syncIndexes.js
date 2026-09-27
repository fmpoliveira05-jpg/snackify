/**
 * Cria os índices definidos nos modelos e apaga os que deixaram de existir (npm run indices).
 *
 * Correr depois de um deploy que mude índices (por exemplo, quando um índice passa a único).
 * Em desenvolvimento o Mongoose já cria os índices em falta ao arrancar, mas não apaga os antigos.
 * Se a criação de um índice único falhar, há dados duplicados a corrigir primeiro (ver README).
 */
const mongoose = require('mongoose');
const { config, assertRequiredConfig } = require('../config/env');

const MODELS = ['user', 'restaurant', 'order', 'voucher', 'dish', 'menu', 'review', 'cart', 'category'];

async function syncAll({ log = console.log } = {}) {
  const results = {};
  for (const name of MODELS) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const Model = require(`../models/${name}`);
    const dropped = await Model.syncIndexes();
    const indexes = await Model.collection.indexes();
    results[Model.modelName] = { dropped, indexes: indexes.map((i) => i.name) };
    log(`${Model.modelName}: ${indexes.map((i) => i.name).join(', ')}${dropped.length ? ` (removidos: ${dropped.join(', ')})` : ''}`);
  }
  return results;
}

if (require.main === module) {
  (async () => {
    assertRequiredConfig();
    await mongoose.connect(config.mongoUri);
    await syncAll();
    await mongoose.disconnect();
  })().catch((err) => {
    console.error('Falha ao sincronizar os índices:', err.message);
    process.exit(1);
  });
}

module.exports = { syncAll, MODELS };
