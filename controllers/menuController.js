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

    res.render('menus/readMenus', { menus: menusWithDishes });
  } catch (err) {
    console.error('Erro ao listar menus:', err);
    res.status(500).send('Erro ao listar menus.');
  }
};

const showAddMenuForm = async (req, res) => {
  try {
    const availableDishes = await Dish.find({
      menuId: null,
      restaurantId: req.user._id
    });

    res.render('menus/createMenu', { availableDishes: availableDishes });
  } catch (err) {
    console.error('Erro ao carregar pratos para o menu:', err);
    res.status(500).send('Erro ao carregar formulário.');
  }
};

const addMenu = async (req, res) => {
  try {
    const { title, description, selectedDishes } = req.body;

    const dishIds = Array.isArray(selectedDishes) ? selectedDishes : [selectedDishes];

    if (!dishIds || dishIds.length > 10) {
      return res.status(400).send('Seleciona no máximo 10 pratos.');
    }

    const newMenu = new Menu({
      restaurantId: req.user._id,
      title,
      description
    });

    await newMenu.save();

    await Dish.updateMany(
      { _id: { $in: dishIds }, restaurantId: req.user._id },
      { $set: { menuId: newMenu._id } }
    );

    res.redirect('/menus');
  } catch (err) {
    console.error('Erro ao adicionar menu:', err);
    res.status(400).send('Erro ao criar menu.');
  }
};

const showEditMenuForm = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    
    if (!menu || !menu.restaurantId.equals(req.user._id)) {
      return res.status(404).send('Menu não encontrado ou acesso negado.');
    }

    const availableDishes = await Dish.find({
      $or: [
        { menuId: { $exists: false } },
        { menuId: null }
      ],
      restaurantId: req.user._id
    });

    res.render('menus/updateMenu', { menu, availableDishes });
  } catch (err) {
    console.error('Erro ao carregar formulário de edição:', err);
    res.status(500).send('Erro ao carregar menu.');
  }
};

const updateMenu = async (req, res) => {
  try {
    const { title, description, availableDishes } = req.body;

    const menu = await Menu.findById(req.params.id);
    if (!menu || !menu.restaurantId.equals(req.user._id)) {
      return res.status(404).send('Menu não encontrado ou acesso negado.');
    }

    menu.title = title;
    menu.description = description;
    await menu.save();

    if (availableDishes) {
      const selectedDishIds = Array.isArray(availableDishes)
        ? availableDishes
        : [availableDishes];

      await Dish.updateMany(
        {
          _id: { $in: selectedDishIds },
          $or: [
            { menuId: null },
            { menuId: { $exists: false } }
          ],
          restaurantId: req.user._id
        },
        { $set: { menuId: menu._id } }
      );
    }

    res.redirect('/menus');
  } catch (err) {
    console.error('Erro ao atualizar menu:', err);
    res.status(500).send('Erro ao atualizar menu.');
  }
};

const deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu || !menu.restaurantId.equals(req.user._id)) {
      return res.status(404).send('Menu não encontrado ou acesso negado.');
    }

    await Dish.deleteMany({ menuId: menu._id });
    await menu.deleteOne();

    res.redirect('/menus');
  } catch (err) {
    console.error('Erro ao deletar menu:', err);
    res.status(500).send('Erro ao deletar menu.');
  }
};

const removeDishFromMenu = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish || !dish.restaurantId.equals(req.user._id)) {
      return res.status(404).send('Prato não encontrado ou acesso negado.');
    }

    dish.menuId = null;
    await dish.save();

    res.redirect('/menus');
  } catch (err) {
    console.error('Erro ao desassociar prato do menu:', err);
    res.status(500).send('Erro ao desassociar prato.');
  }
};

module.exports = {
  listMenus,
  showAddMenuForm,
  addMenu,
  showEditMenuForm,
  updateMenu,
  deleteMenu,
  removeDishFromMenu
};