const { filterRestaurants, filterDishes, lowestPrice } = require('../services/search');

const restaurants = [
  { name: 'Tasca do Zé', address: { place: 'Matosinhos', district: 'Porto' }, createdAt: '2025-01-01' },
  { name: 'Árvore Verde', address: { place: 'Braga', district: 'Braga' }, createdAt: '2025-03-01' },
  { name: 'Bifanas & Cia', address: { place: 'Porto', district: 'Porto' }, createdAt: '2025-02-01' },
];

const dish = (name, prices, restaurant, category = 'c1') => ({
  name,
  description: '',
  category: { _id: category, name: category },
  restaurantId: restaurant,
  pricePerDose: prices.map((price, i) => ({ dose: i ? '1' : '1/2', price })),
});

const dishes = [
  dish('Francesinha', [7, 11], restaurants[0], 'carne'),
  dish('Salada de grão', [4, 6.5], restaurants[1], 'vegetariano'),
  dish('Bifana', [3.5], restaurants[2], 'carne'),
];

describe('pesquisa de restaurantes', () => {
  test('ignora acentos e maiúsculas', () => {
    expect(filterRestaurants(restaurants, { q: 'arvore' }).map((r) => r.name)).toEqual(['Árvore Verde']);
  });

  test('filtra por localidade ou distrito', () => {
    expect(filterRestaurants(restaurants, { location: 'porto' })).toHaveLength(2);
  });

  test('ordena pelo nome ou pelos mais recentes', () => {
    expect(filterRestaurants(restaurants, {}).map((r) => r.name)).toEqual(['Árvore Verde', 'Bifanas & Cia', 'Tasca do Zé']);
    expect(filterRestaurants(restaurants, { sort: 'recentes' })[0].name).toBe('Árvore Verde');
  });
});

describe('pesquisa de pratos', () => {
  test('o preço de referência é o da dose mais barata', () => {
    expect(lowestPrice(dishes[0])).toBe(7);
    expect(lowestPrice({ pricePerDose: [] })).toBe(Infinity);
  });

  test('filtra por categoria e ordena pelo preço', () => {
    const result = filterDishes(dishes, { category: 'carne', sort: 'preco-asc' });
    expect(result.map((d) => d.name)).toEqual(['Bifana', 'Francesinha']);
  });

  test('filtra por intervalo de preço', () => {
    expect(filterDishes(dishes, { minPrice: '4', maxPrice: '7' }).map((d) => d.name)).toEqual(['Francesinha', 'Salada de grão']);
  });

  test('filtra por restaurante e por localização do restaurante', () => {
    expect(filterDishes(dishes, { restaurant: 'tasca' }).map((d) => d.name)).toEqual(['Francesinha']);
    expect(filterDishes(dishes, { location: 'braga' }).map((d) => d.name)).toEqual(['Salada de grão']);
  });

  test('ordena do mais caro para o mais barato', () => {
    expect(filterDishes(dishes, { sort: 'preco-desc' })[0].name).toBe('Francesinha');
  });
});
