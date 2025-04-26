const Dish = require('../models/dish');
const Category = require('../models/category');
const axios = require('axios');
const fetchOpenFoodData = require('../utils/openFoodFactsAPI');

const showEditDishForm = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).send('Prato não encontrado.');
    const categories = await Category.find();
    if (!categories) return res.status(404).send('categorias não encontradas.');
    res.render('dishes/updateDish', { categories, dish, errors: [], oldInput: {} });
  } catch (err) {
    console.error('Erro ao buscar prato:', err);
    res.status(500).send('Erro ao buscar prato.');
  }
};

const updateDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).send('Prato não encontrado.');

    const { name, description, category, dose, price } = req.body;

    let nutritionData = null;
    if (name !== dish.name) {
      nutritionData = await fetchOpenFoodData(name);
      dish.nutriInfo = {
        calories: nutritionData?.calories || null,
        nutriScore: nutritionData?.nutriScore || null,
        allergens: nutritionData?.allergens || []
      };
    }

    dish.name = name;
    dish.description = description;
    dish.category = category;

    dish.pricePerDose = dose.map((d, i) => ({
      dose: d,
      price: parseFloat(price[i])
    }));

    if (req.file) {
      dish.image = `/uploads/images/${req.file.filename}`;
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

const showAddDishForm = async (req, res) => {
  try {
    const categories = await Category.find();
    if (!categories) return res.status(404).send('categorias não encontradas.');
    res.render('dishes/createDish', { categories, errors: [], oldInput: {}       
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar formulário', error: error.message });
  }
};

const addDish = async (req, res) => {
  try {
    const { name, description, category, dose, price } = req.body;
    const image = req.file ? `/uploads/images/${req.file.filename}` : null;

    const nutritionData = await fetchOpenFoodData(name);

    const pricePerDose = dose.map((d, i) => ({
      dose: d,
      price: parseFloat(price[i])
    }));

    const newDish = new Dish({
      name,
      description,
      category,
      image,
      pricePerDose,
      nutriInfo: {
        calories: nutritionData?.calories || null,
        nutriScore: nutritionData?.nutriScore || null,
        allergens: nutritionData?.allergens || []
      },
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

    const nutriInfo = dish.nutriInfo || null;

    res.render('dishes/showDish', { dish, nutriInfo });
  } catch (err) {
    console.error('Erro ao carregar detalhes do prato:', err);
    res.status(500).send('Erro ao carregar detalhes do prato.');
  }
};

const listDishesForClient = async (req, res) => {
  try {
    const restaurantId = req.cookies.restaurantId;

    if (!restaurantId) {
      return res.status(400).send('Restaurante não especificado.');
    }

    const dishes = await Dish.find({ restaurantId });
    res.render('dishes/listForClient', { dishes });
  } catch (err) {
    console.error('Erro ao carregar pratos para o cliente:', err);
    res.status(500).send('Erro ao carregar pratos.');
  }
};


module.exports = {
  showEditDishForm,
  updateDish,
  deleteDish,
  showAddDishForm,
  addDish,
  listDishes,
  showDishDetails,
  listDishesForClient
};