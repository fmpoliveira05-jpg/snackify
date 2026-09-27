/**
 * Corre antes de cada ficheiro de testes: as caches em memória são esvaziadas entre testes,
 * para que os dados simulados de um teste não apareçam no seguinte.
 */
const { invalidateCatalog } = require('../../services/catalogCache');
const { offCache } = require('../../utils/openFoodFactsAPI');

afterEach(() => {
  invalidateCatalog();
  offCache.clear();
});
