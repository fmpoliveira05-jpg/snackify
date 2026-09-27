const axios = require('axios');
const TtlCache = require('./ttlCache');
const { config } = require('../config/env');
const { normalize } = require('../services/search');

/**
 * Resultados recentes (incluindo "sem resultados") ficam em memória: o mesmo nome de prato não
 * volta a ser pedido à OpenFoodFacts durante OFF_CACHE_TTL_SECONDS. Falhas não ficam em cache.
 */
const offCache = new TtlCache({ max: 1000, ttlMs: config.cache.openFoodFactsTtlSeconds * 1000 });
const NO_RESULT = Object.freeze({ empty: true });

/** Tamanho máximo do termo de pesquisa enviado à OpenFoodFacts. */
const MAX_QUERY_LENGTH = 100;

/**
 * Procura o prato na OpenFoodFacts e devolve calorias, NutriScore e alergénios (ou null se não houver resultados ou a API falhar).
 *
 * @param {string} dishName
 * @returns {Promise<object|null>}
 */
const fetchOpenFoodData = async (dishName) => {
  if (typeof dishName !== 'string') return null;
  const searchTerms = dishName.trim().slice(0, MAX_QUERY_LENGTH);
  if (!searchTerms) return null;

  const result = await offCache.wrap(`off:${normalize(searchTerms)}`, () => lookup(searchTerms), {
    shouldCache: (value) => value !== null,
  });
  return result === NO_RESULT ? null : result;
};

/**
 * Pedido à OpenFoodFacts.
 *
 * @returns {Promise<object|null>} dados nutricionais, NO_RESULT se não houver produto, ou null se falhar
 */
const lookup = async (searchTerms) => {
  try {
    const url = 'https://world.openfoodfacts.org/cgi/search.pl';
    const response = await axios.get(url, {
      params: {
        search_terms: searchTerms,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 20
      },
      // Um serviço externo lento ou com respostas enormes não pode prender o pedido do restaurante.
      timeout: 5000,
      maxContentLength: 2 * 1024 * 1024,
      maxRedirects: 2
    });

    const products = response.data?.products;
    if (!Array.isArray(products) || products.length === 0) return NO_RESULT;

    const validProduct = products.find(p => p.nutriments && p.nutriments['energy-kcal_100g']);

    if (!validProduct) return NO_RESULT;

    return {
      calories: validProduct.nutriments['energy-kcal_100g'],
      nutriScore: validProduct.nutriscore_grade?.toUpperCase() || null,
      allergens: validProduct.allergens_tags?.map(tag => tag.replace('en:', '')) || []
    };

  } catch (error) {
    console.error("Erro ao buscar dados da API OpenFoodFacts:", error.code || error.name);
    return null;
  }
};

module.exports = fetchOpenFoodData;
module.exports.MAX_QUERY_LENGTH = MAX_QUERY_LENGTH;
module.exports.offCache = offCache;