const { chooseFolder, fileFilter } = require('../middlewares/uploadMiddleware');
const escapeRegex = require('../utils/escapeRegex');

describe('upload de imagens', () => {
  test.each([
    ['/restaurante/pratos/novo', 'restaurant', 'dishes'],
    ['/user/perfil/encomendas/123/avaliar', 'customer', 'reviews'],
    ['/register/registar-cliente', undefined, 'profilePictures'],
    ['/register/registar-restaurante', undefined, 'logos'],
    ['/user/perfil/editar', 'restaurant', 'logos'],
    ['/user/perfil/editar', 'customer', 'profilePictures'],
  ])('%s (%s) vai para %s', (url, userType, folder) => {
    expect(chooseFolder(url, userType)).toBe(folder);
  });

  const check = (mimetype, originalname = 'foto.png') => new Promise((resolve) => {
    fileFilter({}, { mimetype, originalname }, (err, accepted) => resolve({ err, accepted }));
  });

  test('aceita imagens', async () => {
    await expect(check('image/png')).resolves.toEqual({ err: null, accepted: true });
  });

  test.each(['text/html', 'image/svg+xml', 'application/javascript'])('rejeita %s', async (mimetype) => {
    const { err } = await check(mimetype);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('UploadError');
  });

  test.each(['pagina.html', 'imagem.svg', 'script.php', 'sem-extensao'])('rejeita a extensão de %s', async (name) => {
    const { err } = await check('image/png', name);
    expect(err?.name).toBe('UploadError');
  });
});

describe('escapeRegex', () => {
  test('trata o texto do utilizador de forma literal', () => {
    const pattern = new RegExp(escapeRegex('(a+)+$'));
    expect(pattern.test('menu (a+)+$')).toBe(true);
    expect(pattern.test('aaaa')).toBe(false);
  });
});

describe('limites do multipart', () => {
  const request = require('supertest');
  const createApp = require('../app');
  const { UPLOAD_LIMITS } = require('../middlewares/uploadMiddleware');

  test('estão definidos para ficheiros, campos e partes', () => {
    expect(UPLOAD_LIMITS).toEqual({
      fileSize: 2 * 1024 * 1024, files: 1, fields: 50, fieldSize: 100 * 1024, fieldNameSize: 100, parts: 60,
    });
  });

  test('um campo de texto com mais de 100 KB é recusado com 400', async () => {
    const res = await request(createApp())
      .post('/register/registar-cliente')
      .set('Origin', 'http://localhost:4200')
      .field('name', 'a'.repeat(101 * 1024));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Um dos campos do formulário é demasiado grande.');
  });

  test('mais do que uma imagem é recusada', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const res = await request(createApp())
      .post('/register/registar-cliente')
      .set('Origin', 'http://localhost:4200')
      .attach('profilePicture', png, 'a.png')
      .attach('profilePicture', png, 'b.png');
    expect(res.status).toBe(400);
  });
});
