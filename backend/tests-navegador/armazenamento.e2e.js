/**
 * Teste num browser real (Chromium com Playwright): armazenamento do browser e cookies.
 *
 * npm run test:navegador  (precisa do Angular compilado: cd frontend && npm run build)
 *
 * Arranca um MongoDB em Docker e o servidor (node server.js) a servir o Angular, e depois:
 *  1. regista um cliente no formulário EJS (com a caixa da Política de Privacidade);
 *  2. confirma o email com o link escrito na consola (sem SMTP, em desenvolvimento);
 *  3. entra no Angular e percorre as páginas principais;
 *  4. verifica que o localStorage e o sessionStorage não têm tokens (JWT) nem dados pessoais;
 *  5. verifica que o cookie da sessão é HttpOnly e SameSite=Strict e que o JavaScript não o vê;
 *  6. termina a sessão e verifica que o cookie e o sessionStorage foram apagados.
 * O atributo Secure (produção) é verificado ao nível do cabeçalho em tests/cookies.test.js.
 */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { startMongo, freePort } = require('../scripts/mongoDocker');

const ANGULAR_INDEX = path.join(__dirname, '..', '..', 'frontend', 'dist', 'angular', 'browser', 'index.html');
const PERSON = {
  name: 'Beatriz Lopes',
  username: 'beatriz_e2e',
  email: 'beatriz.e2e@exemplo.pt',
  password: 'Passw0rd!Forte',
  phone: '934567812',
  nif: '123456789',
  street: 'Rua das Flores',
  zipCode: '4050-262',
  place: 'Porto',
};
const JWT_LIKE = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/;

const log = (msg) => console.log(`  ✓ ${msg}`);

/** Todo o conteúdo do localStorage e do sessionStorage da página. */
const readStorage = (page) => page.evaluate(() => {
  const dump = (s) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => [s.key(i), s.getItem(s.key(i))]));
  return { local: dump(localStorage), session: dump(sessionStorage), cookie: document.cookie };
});

function assertNoSecretsInStorage(storage, where) {
  const text = JSON.stringify({ local: storage.local, session: storage.session });
  assert.doesNotMatch(text, JWT_LIKE, `${where}: há um token (JWT) no armazenamento do browser`);
  for (const [field, value] of Object.entries(PERSON)) {
    if (field === 'username' || field === 'password' || value.length < 5) continue;
    assert.ok(!text.toLowerCase().includes(value.toLowerCase()), `${where}: "${field}" está no armazenamento do browser`);
  }
  assert.ok(!text.includes(PERSON.password), `${where}: a password está no armazenamento do browser`);
  const keys = [...Object.keys(storage.local), ...Object.keys(storage.session)].join(' ');
  assert.doesNotMatch(keys, /token|jwt|user|email|sess/i, `${where}: chave suspeita no armazenamento (${keys})`);
  assert.doesNotMatch(storage.cookie, /token|snackify/i, `${where}: o cookie da sessão é visível para o JavaScript`);
}

async function main() {
  if (!fs.existsSync(ANGULAR_INDEX)) {
    throw new Error('Falta o build do Angular: cd frontend && npm run build');
  }
  const mongo = await startMongo('snackify-navegador');
  const port = await freePort();
  const base = `http://localhost:${port}`;
  let output = '';
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      MONGODB_URI: `${mongo.uri}/snackify_navegador`,
      JWT_SECRET: 'segredo-do-teste-no-browser-com-mais-de-32-caracteres',
      CLIENT_URL: base,
      SERVER_URL: base,
      SMTP_HOST: '',
      TURNSTILE_SECRET_KEY: '',
      RETENTION_JOB_ENABLED: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => { output += chunk; });
  server.stderr.on('data', (chunk) => { output += chunk; });

  let browser;
  try {
    for (let i = 0; i < 60 && !output.includes('Servidor a correr'); i += 1) await new Promise((r) => { setTimeout(r, 500); });
    assert.ok(output.includes('Servidor a correr'), `O servidor não arrancou:\n${output}`);

    browser = await chromium.launch();
    const context = await browser.newContext({ locale: 'pt-PT' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Registo no formulário EJS.
    await page.goto(`${base}/register/registar-cliente`);
    assert.equal(await page.isChecked('#acceptPrivacy'), false, 'a caixa da política não pode vir marcada');
    await page.fill('input[name="name"]', PERSON.name);
    await page.fill('input[name="birthDate"]', '1990-05-01');
    await page.fill('input[name="address[street]"]', PERSON.street);
    await page.fill('input[name="address[number]"]', '12');
    await page.fill('input[name="address[zipCode]"]', PERSON.zipCode);
    await page.fill('input[name="address[place]"]', PERSON.place);
    await page.fill('input[name="address[district]"]', 'Porto');
    await page.fill('input[name="phone"]', PERSON.phone);
    await page.fill('input[name="nif"]', PERSON.nif);
    await page.fill('input[name="username"]', PERSON.username);
    await page.fill('input[name="email"]', PERSON.email);
    await page.fill('input[name="password"]', PERSON.password);
    await page.check('#acceptPrivacy');
    await Promise.all([page.waitForURL(/verificar-email\/pendente/), page.click('button[type="submit"]')]);
    log('registo com a Política de Privacidade aceite');

    // 2. Confirmação do email com o link da consola (modo de desenvolvimento, sem SMTP).
    for (let i = 0; i < 20 && !/verificar-email\?token=/.test(output); i += 1) await new Promise((r) => { setTimeout(r, 250); });
    const link = output.match(/https?:\/\/\S+\/verificar-email\?token=[a-f0-9]{64}/)?.[0];
    assert.ok(link, 'o link de confirmação não apareceu na consola');
    await page.goto(link);
    await page.getByText('Email confirmado').waitFor();
    log('email confirmado');

    // 3. Login no Angular e navegação.
    await page.goto(`${base}/login`);
    await page.fill('#username', PERSON.username);
    await page.fill('#password', PERSON.password);
    await Promise.all([page.waitForURL(/\/cliente\/dashboard/), page.click('button[type="submit"]')]);
    for (const route of ['/cliente/restaurantes', '/cliente/pratos', '/cliente/vales', '/cliente/carrinho', '/user/perfil', '/privacidade', '/pagina-que-nao-existe']) {
      await page.goto(`${base}${route}`);
      await page.waitForLoadState('networkidle');
    }
    await page.getByText('Página não encontrada').waitFor();
    log('login e navegação (incluindo a página 404 do Angular)');

    // 4. Armazenamento do browser.
    await page.goto(`${base}/user/perfil`);
    await page.getByText('Histórico de Encomendas').waitFor();
    const storage = await readStorage(page);
    assertNoSecretsInStorage(storage, 'com sessão');
    log(`localStorage ${JSON.stringify(storage.local)} e sessionStorage ${JSON.stringify(storage.session)} sem tokens nem dados pessoais`);

    // 5. Cookies.
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === 'token');
    assert.ok(session, 'não há cookie de sessão');
    for (const cookie of cookies) {
      if (JWT_LIKE.test(cookie.value) || /token|sess|snackify/i.test(cookie.name)) {
        assert.equal(cookie.httpOnly, true, `o cookie ${cookie.name} com token não é HttpOnly`);
        assert.equal(cookie.sameSite, 'Strict', `o cookie ${cookie.name} não é SameSite=Strict`);
      }
    }
    assert.deepEqual(cookies.map((c) => c.name), ['token'], `cookies inesperados: ${cookies.map((c) => c.name).join(', ')}`);
    log('único cookie: sessão HttpOnly e SameSite=Strict, invisível para o JavaScript');

    // 6. Terminar a sessão.
    await page.evaluate(() => sessionStorage.setItem('showSuccessToast', 'true'));
    await Promise.all([page.waitForURL(`${base}/`), page.getByRole('button', { name: 'Logout' }).click()]);
    const after = await context.cookies();
    assert.equal(after.find((c) => c.name === 'token'), undefined, 'o cookie da sessão continua depois do logout');
    const storageAfter = await readStorage(page);
    assert.deepEqual(storageAfter.session, {}, 'o sessionStorage não foi limpo no logout');
    assertNoSecretsInStorage(storageAfter, 'depois do logout');
    const me = await page.request.get(`${base}/auth/me`);
    assert.equal(me.status(), 401, 'a sessão continua válida depois do logout');
    log('logout apaga o cookie e o sessionStorage');

    assert.deepEqual(pageErrors, [], `erros de JavaScript nas páginas: ${pageErrors.join(' | ')}`);
    console.log('\nOK: armazenamento do browser e cookies verificados num Chromium real.');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await new Promise((r) => { server.once('exit', r); setTimeout(r, 5000); });
    mongo.stop();
  }
}

main().catch((err) => {
  console.error(`\nFALHOU: ${err.message}`);
  process.exit(1);
});
