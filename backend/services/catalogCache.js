/**
 * Cache das leituras mais frequentes do catálogo público (restaurantes validados, pratos,
 * menus de cada restaurante e categorias).
 *
 * Qualquer escrita que mude o catálogo (validar ou desativar um restaurante, editar o perfil do
 * restaurante, criar/editar/apagar menus, pratos ou categorias) chama invalidateCatalog().
 * A validade é curta (CACHE_TTL_SECONDS) porque com várias instâncias a invalidação só
 * acontece na instância que fez a escrita.
 */
const TtlCache = require('../utils/ttlCache');
const { config } = require('../config/env');

const catalogCache = new TtlCache({ max: config.cache.maxEntries, ttlMs: config.cache.ttlSeconds * 1000 });

const KEYS = {
  restaurants: 'catalogo:restaurantes',
  dishes: 'catalogo:pratos',
  categories: 'catalogo:categorias',
  menus: (restaurantId) => `catalogo:menus:${restaurantId}`,
};

/** Esquece tudo o que está em cache sobre o catálogo. */
const invalidateCatalog = () => catalogCache.clear('catalogo:');

/** Middleware: invalida o catálogo depois de uma escrita bem-sucedida (resposta 2xx/3xx). */
const invalidateCatalogOnSuccess = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode < 400) invalidateCatalog();
  });
  // Invalida também já: um GET que chegue durante a escrita não guarda dados antigos por muito tempo.
  invalidateCatalog();
  next();
};

module.exports = { catalogCache, KEYS, invalidateCatalog, invalidateCatalogOnSuccess };
