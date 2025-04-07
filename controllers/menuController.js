const Menu = require('../models/menu');
const Dish = require('../models/dish');

const listMenus = async (req, res) => {
  try {
    const restaurantId = req.user._id;
    const menus = await Menu.find({ restaurantId });

    const menusWithDishes = await Promise.all(
      menus.map(async (menu) => {
        const dishes = await Dish.find({ menuId: menu._id });
        return { ...menu.toObject(), dishes };
      })
    );

    res.render('menus/listMenus', { menus: menusWithDishes });
  } catch (err) {
    console.error('Erro ao listar menus:', err);
    res.status(500).send('Erro ao listar menus.');
  }
};

const showAddMenuForm = (req, res) => {
  res.render('menus/addMenu');
};

const addMenu = async (req, res) => {
  try {
    const { title, description, dishes } = req.body;

    if (!dishes || Object.keys(dishes).length > 10) {
      return res.status(400).send('Só é permitido adicionar até 10 pratos por menu.');
    }

    const newMenu = new Menu({
      restaurantId: req.user._id,
      title,
      description
    });

    await newMenu.save();

    const filesMap = {};
    req.files.forEach(file => {
      const match = file.fieldname.match(/dishes\[(\d+)]\[image]/);
      if (match) {
        const index = match[1];
        filesMap[index] = file.filename;
      }
    });

    const dishesArray = Object.values(dishes).map((dish, index) => ({
      ...dish,
      menuId: newMenu._id,
      image: filesMap[index] || null
    }));

    await Dish.insertMany(dishesArray);

    res.redirect('/menus');
  } catch (err) {
    console.error('Erro ao adicionar menu:', err);
    res.status(400).send('Erro ao criar menu.');
  }
};

module.exports = {
  listMenus,
  showAddMenuForm,
  addMenu
};