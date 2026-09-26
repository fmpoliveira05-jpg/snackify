const axios = require('axios');

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
    if (!Array.isArray(products) || products.length === 0) return null;

    const validProduct = products.find(p => p.nutriments && p.nutriments['energy-kcal_100g']);

    if (!validProduct) return null;

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