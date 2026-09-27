/**
 * npm run test:integracao — testes contra um MongoDB real.
 *
 * Com MONGO_TEST_URI definido (ex.: serviço mongo no GitHub Actions) usa esse servidor;
 * senão arranca um mongo:7 descartável em Docker e remove-o no fim.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { startMongo } = require('./mongoDocker');

(async () => {
  let mongo = null;
  if (!process.env.MONGO_TEST_URI) {
    mongo = await startMongo('snackify-integracao');
    process.env.MONGO_TEST_URI = mongo.uri;
    console.log(`MongoDB de teste em Docker: ${mongo.name} (${mongo.uri})`);
  }
  const jestBin = require.resolve('jest/bin/jest');
  const result = spawnSync(process.execPath, [jestBin, '-c', 'jest.integration.config.js', '--runInBand', ...process.argv.slice(2)], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  if (mongo) mongo.stop();
  process.exit(result.status ?? 1);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
