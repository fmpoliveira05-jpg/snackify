const User = require('../models/user');
const { adminData, generateStrongPassword, resolveAdminPassword } = require('../scripts/seed');
const { isStrongPassword } = require('../utils/passwordPolicy');

test('os dados do administrador criados pelo seed respeitam as validações do modelo', async () => {
  const admin = new User(adminData('hash-de-teste'));
  await expect(admin.validate()).resolves.toBeUndefined();
});

test('o administrador do seed fica com o email confirmado', () => {
  expect(adminData('hash').emailVerified).toBe(true);
});

test('sem ADMIN_PASSWORD é gerada uma password forte e diferente de cada vez', () => {
  const a = generateStrongPassword();
  const b = generateStrongPassword();
  expect(isStrongPassword(a)).toBe(true);
  expect(a).not.toBe(b);
  expect(resolveAdminPassword('')).toMatchObject({ generated: true });
});

test('uma ADMIN_PASSWORD fraca é recusada', () => {
  expect(() => resolveAdminPassword('admin2025')).toThrow(/regra/);
  expect(resolveAdminPassword('Admin#Segura2025')).toEqual({ password: 'Admin#Segura2025', generated: false });
});
