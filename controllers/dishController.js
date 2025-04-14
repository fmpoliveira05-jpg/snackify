const Dish = require('../models/dish');

const showEditDishForm = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).send('Prato não encontrado.');

    res.render('dishes/updateDish', { dish });
  } catch (err) {
    console.error('Erro ao buscar prato:', err);
    res.status(500).send('Erro ao buscar prato.');
  }
};

const updateDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).send('Prato não encontrado.');

    const { name, description, category, price, nutriInfo } = req.body;

    dish.name = name;
    dish.description = description;
    dish.category = category;
    dish.price = price;
    dish.nutriInfo = nutriInfo;

    if (req.file) {
      dish.image = req.file.filename;
    }

    await dish.save();
    res.redirect('/menus');
  } catch (err) {
    console.error('Erro ao atualizar prato:', err);
    res.status(500).send('Erro ao atualizar prato.');
  }
};

const deleteDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).send('Prato não encontrado.');

    await dish.deleteOne();
    res.redirect('/pratos');
  } catch (err) {
    console.error('Erro ao remover prato:', err);
    res.status(500).send('Erro ao remover prato.');
  }
};

const showAddDishForm = (req, res) => {
  res.render('dishes/createDish');
};

const addDish = async (req, res) => {
  try {
    const { name, description, category, price, nutriInfo } = req.body;

    const newDish = new Dish({
      name,
      description,
      category,
      price,
      nutriInfo,
      image: req.file ? req.file.filename : null,
      restaurantId: req.user._id,
      menuId: null
    });

    await newDish.save();
    res.redirect('/pratos');
  } catch (err) {
    console.error('Erro ao criar prato:', err);
    res.status(500).send('Erro ao criar prato.');
  }
};

const listDishes = async (req, res) => {
  try {
    const dishes = await Dish.find({ restaurantId: req.user._id });
    res.render('dishes/readDishes', { dishes });
  } catch (err) {
    console.error('Erro ao listar pratos:', err);
    res.status(500).send('Erro ao listar pratos.');
  }
};

module.exports = {
  showEditDishForm,
  updateDish,
  deleteDish,
  showAddDishForm,
  addDish,
  listDishes
};