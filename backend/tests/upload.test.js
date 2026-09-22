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

  const check = (mimetype) => new Promise((resolve) => {
    fileFilter({}, { mimetype }, (err, accepted) => resolve({ err, accepted }));
  });

  test('aceita imagens', async () => {
    await expect(check('image/png')).resolves.toEqual({ err: null, accepted: true });
  });

  test.each(['text/html', 'image/svg+xml', 'application/javascript'])('rejeita %s', async (mimetype) => {
    const { err } = await check(mimetype);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('UploadError');
  });
});

describe('escapeRegex', () => {
  test('trata o texto do utilizador de forma literal', () => {
    const pattern = new RegExp(escapeRegex('(a+)+$'));
    expect(pattern.test('menu (a+)+$')).toBe(true);
    expect(pattern.test('aaaa')).toBe(false);
  });
});
