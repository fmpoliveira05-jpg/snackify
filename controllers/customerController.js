const Restaurant = require('../models/restaurant');
const Dish = require('../models/dish');
const Menu = require('../models/menu');

const listRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.render('customer/readRestaurants', { restaurants });
  } catch (err) {
    res.status(500).send('Erro ao carregar os restaurantes.');
  }
};

const listMenus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).send('Restaurante não encontrado.');

    const menus = await Menu.find({ restaurantId: restaurant._id });

    const menusComPratos = await Promise.all(menus.map(async menu => {
      const pratos = await Dish.find({ menuId: menu._id });
      return { ...menu.toObject(), dishes: pratos };
    }));

    res.render('customer/readMenus', { restaurant, menus: menusComPratos });
  } catch (err) {
    console.error('Erro ao carregar os menus:', err);
    res.status(500).send('Erro ao carregar os menus.');
  }
};

const listDishes = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).send('Menu não encontrado.');

    const dishes = await Dish.find({ menuId: menu._id });

    res.render('customer/readDishes', { menu, dishes });
  } catch (err) {
    console.error('Erro ao carregar os pratos:', err);
    res.status(500).send('Erro ao carregar os pratos.');
  }
};

module.exports = {
    listRestaurants,
    listMenus,
    listDishes
};