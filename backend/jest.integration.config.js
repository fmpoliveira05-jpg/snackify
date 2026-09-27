/**
 * Testes de integração contra um MongoDB real (npm run test:integracao).
 * Ficam fora do `npm test`, que corre sem base de dados.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests-integracao/**/*.int.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/support/setup.js'],
  testTimeout: 60000,
};
