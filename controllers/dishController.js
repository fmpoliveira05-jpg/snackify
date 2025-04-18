const Dish = require('../models/dish');
const axios = require('axios');

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
      dish.image = req.file ? `/uploads/images/${req.file.filename}` : null;
    }

    await dish.save();
    res.redirect('/pratos');
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
    const image = req.file ? `/uploads/images/${req.file.filename}` : null;

    const newDish = new Dish({
      name,
      description,
      category,
      price,
      nutriInfo,
      image,
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

const showDishDetails = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).send('Prato não encontrado.');

    let nutriInfo = null;

    try {
      const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
        params: {
          search_terms: dish.name,
          search_simple: 1,
          action: 'process',
          json: 1
        }
      });

      const product = response.data.products[0];

      if (product) {
        nutriInfo = {
          calories: product.nutriments?.['energy-kcal_100g'],
          nutriScore: product.nutriscore_grade,
          allergens: product.allergens
        };
      }
    } catch (apiErr) {
      console.error('Erro ao obter dados da OpenFoodFacts:', apiErr.message);
    }

    res.render('dishes/showDish', { dish, nutriInfo });

  } catch (err) {
    console.error('Erro ao carregar detalhes do prato:', err);
    res.status(500).send('Erro ao carregar detalhes do prato.');
  }
};

module.exports = {
  showEditDishForm,
  updateDish,
  deleteDish,
  showAddDishForm,
  addDish,
  listDishes,
  showDishDetails
};