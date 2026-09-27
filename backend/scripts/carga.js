/**
 * Teste de carga (npm run carga): arranca a aplicação contra um MongoDB em Docker com dados de
 * exemplo e mede latência (p50/p99), débito e erros com o autocannon.
 *
 * Cenários (duração e ligações configuráveis):
 *  1. páginas públicas: /health/ready, página inicial (EJS) e cliente Angular (index.html);
 *  2. API autenticada: sessão, restaurantes, pesquisa de pratos, menus e categorias;
 *  3. fluxo do carrinho (escritas): adicionar um prato e ver o carrinho.
 *
 * Variáveis: CARGA_LIGACOES (100), CARGA_DURACAO (20 s), CARGA_LIGACOES_ESCRITA (20),
 * CARGA_MONGO_URI (usa um MongoDB já existente em vez do Docker; a base "snackify_carga" é apagada).
 * Os limites por IP ficam ligados mas muito altos (RATE_LIMIT_API_MAX): todos os pedidos vêm
 * do mesmo IP, o que num cenário real corresponderia a muitos utilizadores diferentes.
 */
const http = require('http');
const autocannon = require('autocannon');
const { startMongo } = require('./mongoDocker');

const CONNECTIONS = Number(process.env.CARGA_LIGACOES || 100);
const DURATION = Number(process.env.CARGA_DURACAO || 20);
const WRITE_CONNECTIONS = Number(process.env.CARGA_LIGACOES_ESCRITA || 20);
const PASSWORD = 'Carga!Teste2026';

const run = (options) => new Promise((resolve, reject) => {
  const instance = autocannon(options, (err, result) => (err ? reject(err) : resolve(result)));
  autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false, renderLatencyTable: false });
});

/** NIF válido (dígito de controlo) a partir de 8 algarismos. */
const nifFor = (eight) => {
  const n = String(eight).padStart(8, '0').split('').map(Number);
  const mod = n.reduce((acc, d, i) => acc + d * (9 - i), 0) % 11;
  return `${n.join('')}${mod < 2 ? 0 : 11 - mod}`;
};

async function seed(models, bcrypt) {
  const { User, Restaurant, Menu, Dish, Category } = models;
  const hash = await bcrypt.hash(PASSWORD, 10);
  const categories = await Category.insertMany(['Carne', 'Peixe', 'Vegetariano', 'Sobremesa'].map((name) => ({ name })));
  const address = { street: 'Rua Direita', number: '10', zipCode: '4000-123', place: 'Porto', district: 'Porto', country: 'Portugal' };
  const restaurants = await Restaurant.insertMany(Array.from({ length: 30 }, (_, i) => ({
    name: `Restaurante ${i}`, username: `rest${i}`, email: `rest${i}@exemplo.pt`, password: hash, phone: '223456789',
    nif: nifFor(50800000 + i), foundedAt: new Date('2000-01-01'), isChecked: true, emailVerified: true, address,
  })));
  for (const restaurant of restaurants) {
    const menus = await Menu.insertMany([1, 2, 3].map((n) => ({ restaurantId: restaurant._id, title: `Menu ${n}` })));
    await Dish.insertMany(menus.flatMap((menu, m) => Array.from({ length: 5 }, (_, d) => ({
      restaurantId: restaurant._id, menuId: menu._id, name: `Prato ${m}-${d} de ${restaurant.name}`, category: categories[d % 4]._id,
      pricePerDose: [{ dose: '1', price: 8 + d }, { dose: '1/2', price: 5 + d }],
    }))));
  }
  await User.create({
    name: 'Carla Teste', username: 'cliente_carga', email: 'carga@exemplo.pt', password: hash, birthDate: new Date('1990-01-01'),
    phone: '912345678', userType: 'customer', emailVerified: true, address,
  });
  const dish = await Dish.findOne().lean();
  return { restaurantId: String(restaurants[0]._id), dishId: String(dish._id) };
}

const summary = (name, r) => ({
  cenario: name,
  pedidos: r.requests.total,
  'pedidos/s': Math.round(r.requests.average),
  'p50 (ms)': r.latency.p50,
  'p99 (ms)': r.latency.p99,
  'máx (ms)': r.latency.max,
  erros: r.errors,
  timeouts: r.timeouts,
  'não 2xx': r.non2xx,
  códigos: Object.entries(r.statusCodeStats || {}).map(([code, v]) => `${code}:${v.count}`).join(' '),
});

(async () => {
  let mongo = null;
  let uri = process.env.CARGA_MONGO_URI;
  if (!uri) {
    mongo = await startMongo('snackify-carga');
    uri = mongo.uri;
  }
  const url = new URL(uri);
  url.pathname = '/snackify_carga';

  Object.assign(process.env, {
    NODE_ENV: 'production',
    MONGODB_URI: url.toString(),
    JWT_SECRET: 'segredo-do-teste-de-carga-com-mais-de-32-caracteres',
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_API_MAX: '100000000',
    RETENTION_JOB_ENABLED: 'false',
    SERVER_URL: 'http://127.0.0.1',
  });

  const mongoose = require('mongoose');
  const bcrypt = require('bcryptjs');
  const createApp = require('../app');
  const { applyServerTimeouts, mongoOptions } = require('../server');
  const models = {
    User: require('../models/user'),
    Restaurant: require('../models/restaurant'),
    Menu: require('../models/menu'),
    Dish: require('../models/dish'),
    Category: require('../models/category'),
  };

  let server;
  try {
    await mongoose.connect(url.toString(), mongoOptions());
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(models).map((M) => M.syncIndexes()));
    const ids = await seed(models, bcrypt);

    server = applyServerTimeouts(http.createServer(createApp()));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const origin = base;
    process.env.CLIENT_URL = origin;
    require('../config/env').config.clientUrl = origin;
    require('../config/env').config.serverUrl = origin;

    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ username: 'cliente_carga', password: PASSWORD }),
    });
    if (login.status !== 200) throw new Error(`Login falhou (${login.status})`);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    console.log(`Aplicação em ${base}; ${CONNECTIONS} ligações durante ${DURATION} s por cenário.\n`);

    const results = [];
    results.push(summary('públicas', await run({
      url: base, connections: CONNECTIONS, duration: DURATION,
      requests: [
        { method: 'GET', path: '/health/ready' },
        { method: 'GET', path: '/', headers: { accept: 'text/html' } },
        { method: 'GET', path: '/login', headers: { accept: 'text/html' } },
      ],
    })));
    results.push(summary('API autenticada', await run({
      url: base, connections: CONNECTIONS, duration: DURATION, headers: { cookie },
      requests: [
        { method: 'GET', path: '/auth/me' },
        { method: 'GET', path: '/cliente/api/restaurantes' },
        { method: 'GET', path: '/cliente/api/pratos?q=prato&sort=preco-asc' },
        { method: 'GET', path: `/cliente/api/restaurantes/${ids.restaurantId}/menus` },
        { method: 'GET', path: '/cliente/api/categorias' },
      ],
    })));
    results.push(summary('carrinho (escritas)', await run({
      url: base, connections: WRITE_CONNECTIONS, duration: Math.max(5, Math.round(DURATION / 2)),
      headers: { cookie, origin, 'content-type': 'application/json' },
      requests: [
        { method: 'POST', path: '/cliente/api/carrinho/adicionar', body: JSON.stringify({ dishId: ids.dishId, amount: 1, dose: '1' }) },
        { method: 'GET', path: '/cliente/api/carrinho' },
      ],
    })));

    console.table(results);
    const failed = results.some((r) => r.erros > 0 || r.timeouts > 0 || r['não 2xx'] > 0);
    console.log(failed ? 'FALHOU: houve erros, timeouts ou respostas não 2xx.' : 'OK: sem erros, timeouts nem respostas não 2xx.');
    process.exitCode = failed ? 1 : 0;
  } finally {
    // Espera que os pedidos ainda em curso terminem antes de fechar a ligação ao MongoDB.
    if (server) await new Promise((resolve) => { server.close(resolve); server.closeIdleConnections?.(); });
    await new Promise((resolve) => { setTimeout(resolve, 2000); });
    await mongoose.disconnect().catch(() => {});
    if (mongo) mongo.stop();
  }
})().catch((err) => {
  console.error('Teste de carga interrompido:', err.message);
  process.exit(1);
});
