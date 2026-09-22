/**
 * Pesquisa, filtros e ordenação de restaurantes e pratos para a área de cliente.
 * Trabalha sobre listas já carregadas da base de dados, por isso é testável sem MongoDB.
 */

/**
 * Normaliza texto para comparar sem acentos nem maiúsculas ("Matosinhos" ≈ "matosinhos").
 *
 * @param {*} text
 * @returns {string}
 */
function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const includes = (haystack, needle) => !needle || normalize(haystack).includes(normalize(needle));

/**
 * @param {Array<{pricePerDose?: Array<{price: number}>}>} dish
 * @returns {number} o preço mais baixo do prato (Infinity se não tiver preços)
 */
function lowestPrice(dish) {
  const prices = (dish.pricePerDose || []).map((p) => p.price).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : Infinity;
}

/**
 * Filtra e ordena restaurantes.
 *
 * @param {Array<object>} restaurants restaurantes validados
 * @param {{q?: string, location?: string, sort?: string}} query q procura no nome;
 *        location procura na localidade e no distrito; sort: 'nome' (omissão) ou 'recentes'
 * @returns {Array<object>}
 */
function filterRestaurants(restaurants, query = {}) {
  const result = restaurants.filter((r) =>
    includes(r.name, query.q)
    && (!query.location || includes(r.address?.place, query.location) || includes(r.address?.district, query.location)));

  if (query.sort === 'recentes') {
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return result.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
}

/**
 * Filtra e ordena pratos de todos os restaurantes validados.
 *
 * @param {Array<object>} dishes pratos com `restaurantId` e `category` já preenchidos (populate)
 * @param {object} query
 * @param {string} [query.q] texto no nome ou na descrição
 * @param {string} [query.category] id da categoria
 * @param {string} [query.restaurant] texto no nome do restaurante
 * @param {string} [query.location] localidade ou distrito do restaurante
 * @param {number|string} [query.minPrice] preço mínimo (considera a dose mais barata)
 * @param {number|string} [query.maxPrice] preço máximo (considera a dose mais barata)
 * @param {string} [query.sort] 'preco-asc', 'preco-desc' ou 'nome' (omissão)
 * @returns {Array<object>}
 */
function filterDishes(dishes, query = {}) {
  const min = query.minPrice === undefined || query.minPrice === '' ? -Infinity : Number(query.minPrice);
  const max = query.maxPrice === undefined || query.maxPrice === '' ? Infinity : Number(query.maxPrice);

  const result = dishes.filter((d) => {
    const price = lowestPrice(d);
    const restaurant = d.restaurantId || {};
    return (includes(d.name, query.q) || includes(d.description, query.q))
      && (!query.category || String(d.category?._id ?? d.category) === String(query.category))
      && includes(restaurant.name, query.restaurant)
      && (!query.location || includes(restaurant.address?.place, query.location) || includes(restaurant.address?.district, query.location))
      && price >= min && price <= max;
  });

  switch (query.sort) {
    case 'preco-asc':
      return result.sort((a, b) => lowestPrice(a) - lowestPrice(b));
    case 'preco-desc':
      return result.sort((a, b) => lowestPrice(b) - lowestPrice(a));
    default:
      return result.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
  }
}

module.exports = { normalize, lowestPrice, filterRestaurants, filterDishes };
