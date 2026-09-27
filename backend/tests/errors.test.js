/**
 * Páginas de erro: 404 em JSON na API, página EJS no back-office, 500 sem pormenores internos
 * e source maps bloqueados em produção.
 */
const path = require('path');
const express = require('express');
const request = require('supertest');
const createApp = require('../app');
const errorHandler = require('../middlewares/errorHandler');

const app = createApp();

afterEach(() => jest.restoreAllMocks());

describe('404', () => {
  test.each([
    '/cliente/api/nao-existe',
    '/auth/nao-existe',
    '/admin/nao-existe',
    '/api/nao-existe',
    '/user/api/nao-existe',
  ])('%s responde 404 em JSON, mesmo quando o browser pede HTML', async (url) => {
    const res = await request(app).get(url).set('Accept', 'text/html');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({ message: 'Recurso não encontrado.' });
  });

  test('uma página inexistente do back-office mostra a página 404 em EJS', async () => {
    const res = await request(app).get('/restaurante/nao-existe').set('Accept', 'text/html');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/Página não encontrada/);
    expect(res.text).toMatch(/href="\/"/);
  });

  test('um ficheiro inexistente pedido pelo browser mostra a página 404', async () => {
    const res = await request(app).get('/nao-existe.txt').set('Accept', 'text/html');
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/Página não encontrada/);
  });

  test('um método desconhecido na API responde 404 em JSON', async () => {
    const res = await request(app).post('/cliente/api/nao-existe').set('Origin', 'http://localhost:4200');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Recurso não encontrado.');
  });
});

describe('500', () => {
  const brokenApp = () => {
    const broken = express();
    broken.set('view engine', 'ejs');
    broken.set('views', path.join(__dirname, '..', 'views'));
    broken.get('/restaurante/rebenta', () => { throw new Error('segredo interno em /srv/app/db.js'); });
    broken.get('/cliente/api/rebenta', () => { throw new Error('segredo interno em /srv/app/db.js'); });
    broken.use(errorHandler);
    return broken;
  };

  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

  test('no browser mostra a página de erro sem a mensagem nem o stack trace', async () => {
    const res = await request(brokenApp()).get('/restaurante/rebenta').set('Accept', 'text/html');
    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/Ocorreu um erro/);
    expect(res.text).not.toMatch(/segredo|\/srv\/app|at /);
  });

  test('na API responde em JSON sem pormenores', async () => {
    const res = await request(brokenApp()).get('/cliente/api/rebenta').set('Accept', 'text/html');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Erro interno do servidor.' });
  });
});

describe('source maps em produção', () => {
  const productionApp = () => {
    const saved = { ...process.env };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'x'.repeat(40);
    let prodApp;
    try {
      jest.isolateModules(() => { prodApp = require('../app')(); });
    } finally {
      process.env = saved;
    }
    return prodApp;
  };

  test.each(['/main-ABC.js.map', '/styles-XYZ.css.map', '/javascripts/drawCharts.js.map', '/qualquer/coisa.map'])(
    '%s responde 404',
    async (url) => {
      const res = await request(productionApp()).get(url);
      expect(res.status).toBe(404);
    },
  );
});

describe('back-office sem dependências de terceiros', () => {
  test('o Bootstrap é servido pelo próprio servidor', async () => {
    const css = await request(app).get('/vendor/bootstrap/css/bootstrap.min.css');
    expect(css.status).toBe(200);
    const js = await request(app).get('/vendor/bootstrap/js/bootstrap.bundle.min.js');
    expect(js.status).toBe(200);
  });

  test('nenhuma página EJS carrega o Bootstrap nem tipos de letra de uma CDN', () => {
    const fs = require('fs');
    const views = path.join(__dirname, '..', 'views');
    const files = fs.readdirSync(views, { recursive: true }).filter((f) => f.endsWith('.ejs'));
    files.forEach((file) => {
      const content = fs.readFileSync(path.join(views, file), 'utf8');
      expect(content).not.toMatch(/cdn\.jsdelivr|fonts\.googleapis|fonts\.gstatic/);
    });
  });

  test('os formulários EJS ficam protegidos contra envios em duplicado', () => {
    const fs = require('fs');
    const script = fs.readFileSync(path.join(__dirname, '..', 'public', 'javascripts', 'confirmActions.js'), 'utf8');
    expect(script).toMatch(/data-submitting/);
    expect(script).toMatch(/disabled = true/);
  });
});
