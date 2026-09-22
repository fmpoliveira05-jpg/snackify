const axios = require('axios');

/**
 * Procura o prato na OpenFoodFacts e devolve calorias, NutriScore e alergénios (ou null se não houver resultados ou a API falhar).
 *
 * @param {string} dishName
 * @returns {Promise<object|null>}
 */
const fetchOpenFoodData = async (dishName) => {
  try {
    const url = 'https://world.openfoodfacts.org/cgi/search.pl';
    const response = await axios.get(url, {
      params: {
        search_terms: dishName,
        search_simple: 1,
        action: 'process',
        json: 1
      }
    });

    const products = response.data.products;
    if (!products || products.length === 0) return null;

    const validProduct = products.find(p => p.nutriments && p.nutriments['energy-kcal_100g']);

    if (!validProduct) return null;

    return {
      calories: validProduct.nutriments['energy-kcal_100g'],
      nutriScore: validProduct.nutriscore_grade?.toUpperCase() || null,
      allergens: validProduct.allergens_tags?.map(tag => tag.replace('en:', '')) || []
    };

  } catch (error) {
    console.error("Erro ao buscar dados da API OpenFoodFacts:", error.message);
    return null;
  }
};

module.exports = fetchOpenFoodData;