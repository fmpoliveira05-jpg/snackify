/**
 * Cache em memória (catálogo e OpenFoodFacts) e cabeçalhos de cache HTTP.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const request = require('supertest');
const createApp = require('../app');
const TtlCache = require('../utils/ttlCache');
const fetchOpenFoodData = require('../utils/openFoodFactsAPI');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const { asUser, mockQuery } = require('./support/helpers');

afterEach(() => jest.restoreAllMocks());

describe('TtlCache', () => {
  test('expira as entradas ao fim da validade', () => {
    let now = 0;
    const cache = new TtlCache({ ttlMs: 1000, now: () => now });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    now = 1000;
    expect(cache.get('a')).toBeUndefined();
  });

  test('não passa do número máximo de entradas (sai a usada há mais tempo)', () => {
    const cache = new TtlCache({ max: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.size).toBe(2);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
  });

  test('pedidos simultâneos para a mesma chave fazem um só cálculo', async () => {
    const cache = new TtlCache();
    const load = jest.fn(() => new Promise((resolve) => setTimeout(() => resolve('v'), 10)));
    const values = await Promise.all([cache.wrap('k', load), cache.wrap('k', load), cache.wrap('k', load)]);
    expect(values).toEqual(['v', 'v', 'v']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  test('um valor calculado durante uma invalidação não fica guardado', async () => {
    const cache = new TtlCache();
    let release;
    const pending = cache.wrap('catalogo:x', () => new Promise((resolve) => { release = resolve; }));
    cache.clear('catalogo:');
    release('antigo');
    await pending;
    expect(cache.get('catalogo:x')).toBeUndefined();
  });

  test('clear(prefixo) só apaga as chaves com esse prefixo', () => {
    const cache = new TtlCache();
    cache.set('catalogo:a', 1);
    cache.set('off:b', 2);
    cache.clear('catalogo:');
    expect(cache.get('catalogo:a')).toBeUndefined();
    expect(cache.get('off:b')).toBe(2);
  });
});

describe('OpenFoodFacts', () => {
  const product = { nutriments: { 'energy-kcal_100g': 250 }, nutriscore_grade: 'b', allergens_tags: ['en:gluten'] };

  test('o mesmo prato (sem acentos nem maiúsculas) só é pedido uma vez', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: { products: [product] } });
    const first = await fetchOpenFoodData('Pão de Ló');
    const second = await fetchOpenFoodData('pao de lo');
    expect(first).toEqual({ calories: 250, nutriScore: 'B', allergens: ['gluten'] });
    expect(second).toEqual(first);
    expect(get).toHaveBeenCalledTimes(1);
  });

  test('"sem resultados" também fica em cache, mas uma falha não', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const get = jest.spyOn(axios, 'get')
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }))
      .mockResolvedValue({ data: { products: [] } });
    expect(await fetchOpenFoodData('Bacalhau')).toBeNull();
    expect(await fetchOpenFoodData('Bacalhau')).toBeNull();
    expect(await fetchOpenFoodData('Bacalhau')).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe('catálogo em cache', () => {
  const app = createApp();
  const asCustomer = (req) => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer' });
    return asUser(req, 'c1', 'customer');
  };

  test('a lista de restaurantes é lida uma vez e servida da cache', async () => {
    const find = mockQuery(Restaurant, 'find', [{ _id: 'r1', name: 'Tasca', address: {} }]);
    await asCustomer(request(app).get('/cliente/api/restaurantes'));
    const res = await asCustomer(request(app).get('/cliente/api/restaurantes'));
    expect(res.body).toHaveLength(1);
    expect(find).toHaveBeenCalledTimes(1);
  });

  test('uma escrita do administrador invalida a cache', async () => {
    const find = mockQuery(Restaurant, 'find', [{ _id: 'r1', name: 'Tasca', address: {} }]);
    await asCustomer(request(app).get('/cliente/api/restaurantes'));
    await asCustomer(request(app).get('/cliente/api/restaurantes'));
    expect(find).toHaveBeenCalledTimes(1);

    mockQuery(User, 'findById', { _id: 'a1', userType: 'admin' });
    jest.spyOn(Restaurant, 'findByIdAndUpdate').mockResolvedValue({ _id: 'r1' });
    const admin = await asUser(request(app).post('/admin/validar-restaurante/507f1f77bcf86cd799439011'), 'a1', 'admin');
    expect(admin.status).toBe(200);

    await asCustomer(request(app).get('/cliente/api/restaurantes'));
    expect(find).toHaveBeenCalledTimes(2);
  });
});

describe('cabeçalhos de cache HTTP', () => {
  let dist;
  let app;

  beforeAll(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'snackify-dist-'));
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Snackify</title>');
    fs.writeFileSync(path.join(dist, 'main-ABCDEF12.js'), 'console.log(1);');
    fs.writeFileSync(path.join(dist, 'favicon.ico'), '');
    app = createApp({ angularDist: dist });
  });
  afterAll(() => fs.rmSync(dist, { recursive: true, force: true }));

  test('os ficheiros do Angular com hash ficam em cache um ano (immutable)', async () => {
    const res = await request(app).get('/main-ABCDEF12.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers.etag).toBeDefined();
  });

  test('o index.html (e as rotas do Angular) são sempre revalidados', async () => {
    const res = await request(app).get('/cliente/restaurantes').set('Accept', 'text/html');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  test('ficheiros sem hash são revalidados e respondem 304 com o ETag', async () => {
    const first = await request(app).get('/stylesheets/styles.css');
    expect(first.headers['cache-control']).toBe('no-cache');
    const second = await request(app).get('/stylesheets/styles.css').set('If-None-Match', first.headers.etag);
    expect(second.status).toBe(304);
  });

  test.each(['/auth/me', '/cliente/api/restaurantes', '/user/perfil/dados', '/admin/validar-restaurantes'])(
    'a resposta de %s tem Cache-Control: no-store',
    async (url) => {
      const res = await request(app).get(url);
      expect(res.headers['cache-control']).toBe('no-store');
    },
  );

  test('uma resposta autenticada da API também tem no-store e ETag', async () => {
    mockQuery(User, 'findById', { _id: 'c1', userType: 'customer', toJSON() { return { _id: 'c1' }; } });
    const res = await asUser(request(app).get('/auth/me'), 'c1', 'customer');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers.etag).toBeDefined();
  });
});
