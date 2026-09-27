/**
 * Arranca e pára um MongoDB descartável em Docker (mongo:7) para os testes de integração,
 * o teste de carga e o teste do navegador.
 *
 * O contentor fica só em 127.0.0.1, numa porta livre escolhida ao acaso, guarda os dados em memória
 * (tmpfs) e é removido no fim, sem deixar volumes.
 */
const { execFileSync } = require('child_process');
const net = require('net');

const IMAGE = process.env.MONGO_TEST_IMAGE || 'mongo:7';

const docker = (args, options = {}) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();

/** Pede ao sistema uma porta TCP livre. */
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * @param {string} [prefix] início do nome do contentor
 * @returns {Promise<{name: string, uri: string, port: number, stop: () => void}>}
 */
async function startMongo(prefix = 'snackify-teste') {
  const port = await freePort();
  const name = `${prefix}-${process.pid}-${Date.now().toString(36)}`;
  // Dados em tmpfs (memória): mais rápido e não deixa volumes do Docker para trás.
  docker([
    'run', '-d', '--rm', '--name', name, '-p', `127.0.0.1:${port}:27017`,
    '--tmpfs', '/data/db', '--tmpfs', '/data/configdb',
    IMAGE, '--quiet', '--wiredTigerCacheSizeGB', '0.25',
  ]);
  const stop = () => {
    try {
      // -v: remove também volumes anónimos (senão ficam ~300 MB por execução no disco).
      docker(['rm', '-f', '-v', name]);
    } catch {
      // já não existe
    }
  };

  const deadline = Date.now() + 60000;
  for (;;) {
    try {
      const out = docker(['exec', name, 'mongosh', '--quiet', '--eval', 'db.runCommand({ ping: 1 }).ok']);
      if (out.endsWith('1')) break;
    } catch {
      // ainda a arrancar
    }
    if (Date.now() > deadline) {
      stop();
      throw new Error('O MongoDB em Docker não arrancou a tempo.');
    }
    await sleep(500);
  }
  return { name, port, uri: `mongodb://127.0.0.1:${port}`, stop };
}

module.exports = { startMongo, freePort, docker };
