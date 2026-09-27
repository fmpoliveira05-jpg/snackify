/**
 * Leitura de menus com os respetivos pratos.
 */
const { trusted } = require('mongoose');
const Dish = require('../models/dish');
const { config } = require('../config/env');

/**
 * Junta a cada menu os seus pratos com UMA consulta (antes era uma consulta por menu: N+1).
 *
 * @param {Array<object>} menus menus em objetos simples (lean)
 * @param {{populateCategory?: boolean}} [options]
 * @returns {Promise<Array<object>>} os menus, cada um com `dishes`
 */
async function withDishes(menus, { populateCategory = false } = {}) {
  if (menus.length === 0) return [];
  let query = Dish.find({ menuId: trusted({ $in: menus.map((m) => m._id) }) });
  if (populateCategory) query = query.populate('category', 'name');
  const dishes = await query.lean().maxTimeMS(config.timeouts.query);
  const byMenu = new Map(menus.map((m) => [String(m._id), []]));
  dishes.forEach((dish) => byMenu.get(String(dish.menuId))?.push(dish));
  return menus.map((menu) => ({ ...menu, dishes: byMenu.get(String(menu._id)) }));
}

module.exports = { withDishes };
