const User = require('../models/user');
const { adminData } = require('../scripts/seed');

test('os dados do administrador criados pelo seed respeitam as validações do modelo', async () => {
  const admin = new User(adminData('hash-de-teste'));
  await expect(admin.validate()).resolves.toBeUndefined();
});
