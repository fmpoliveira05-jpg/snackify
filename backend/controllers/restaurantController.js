const Order = require('../models/order');
const Menu = require('../models/menu');
const Dish = require('../models/dish');
const Category = require('../models/category');
const Review = require('../models/review');
const fetchOpenFoodData = require('../utils/openFoodFactsAPI');
const { selectedDishesValidator } = require('../models/backend-validations/dishValidations');
const { wrapAll } = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { MAX_DISHES_PER_MENU } = require('../services/orderRules');

const toArray = (value) => (value === undefined || value === null ? [] : [].concat(value));

/** Procura um prato do restaurante autenticado; pratos de outros restaurantes "não existem". */
const findOwnDish = (req, id) => Dish.findOne({ _id: id, restaurantId: req.user._id });

/** Constrói a lista de preços a partir dos campos dose[] e price[] do formulário. */
const buildPricePerDose = (dose, price) => {
  const prices = toArray(price);
  return toArray(dose).map((d, i) => ({ dose: d, price: Number.parseFloat(prices[i]) }));
};

const showRestaurantDashboard = async (req, res) => {
  try {
    // Só as encomendas deste restaurante (antes o gráfico mostrava as de todos).
    const orderStats = await Order.aggregate([
      { $match: { restaurantId: req.user._id } },
      { $group: { _id: "$state", count: { $sum: 1 } } },
      { $project: { _id: 0, state: "$_id", count: 1 } }
    ]);

    res.render('dashboards/restaurantDashboard', { orderStats, search: {}});
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar dados de encomendas.');
  }
};

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

const searchMenus = async (req, res) => {
  try {
    const { field, value } = req.query;

    if (!field || !value || typeof value !== 'string' || value.trim() === '') {
      return res.status(400).send("Campo ou valor de pesquisa inválido.");
    }

    const trimmedValue = value.trim();
    const searchValue = parseFloat(trimmedValue);

    let menus = [];

    if (["title", "description"].includes(field)) {
      const filter = {
        restaurantId: req.user._id,
        [field]: { $regex: escapeRegex(trimmedValue), $options: "i" }
      };
      menus = await Menu.find(filter);
    }

    if (["priceFull", "priceHalf"].includes(field)) {
      const doseTarget = field === "priceFull" ? "1" : "1/2";

      const matchingDishes = await Dish.find({
        restaurantId: req.user._id,
        pricePerDose: {
          $elemMatch: {
            dose: doseTarget,
            price: searchValue
          }
        }
      });

      if (!matchingDishes.length) {
        return res.status(404).send("Nenhum menu encontrado com o preço especificado.");
      }

      const menuIds = [...new Set(matchingDishes
        .filter(dish => dish.menuId) 
        .map(dish => dish.menuId.toString())
      )];

      if (!menuIds.length) {
        return res.status(404).send("Menus correspondentes não encontrados.");
      }

      menus = await Menu.find({ _id: { $in: menuIds } });
    }

    if (!menus.length) {
      return res.status(404).send("Nenhum menu encontrado.");
    }

    const menusWithDishes = await Promise.all(
      menus.map(async (menu) => {
        const dishes = await Dish.find({ menuId: menu._id });
        return {
          ...menu.toObject(),
          dishes
        };
      })
    );

    res.render("menus/searchMenu", {
      menus: menusWithDishes,
      search: { field, value }
    });

  } catch (err) {
    console.error("Erro ao pesquisar menus:", err);
    res.status(500).send("Erro ao pesquisar menus.");
  }
};

const showAddMenuForm = async (req, res) => {
  try {
    const availableDishes = await Dish.find({
      menuId: null,
      restaurantId: req.user._id
    }).populate('category', 'name');

    res.render('menus/createMenu', { availableDishes: availableDishes, errors: [], oldInput: {} });
  } catch (err) {
    console.error('Erro ao carregar pratos para o menu:', err);
    res.status(500).send('Erro ao carregar formulário.');
  }
};

const addMenu = async (req, res) => {
  try {
    const { title, description, selectedDishes } = req.body;

    const dishIds = toArray(selectedDishes);

    if (dishIds.length > MAX_DISHES_PER_MENU) {
      return res.status(400).send(`Um menu pode ter no máximo ${MAX_DISHES_PER_MENU} pratos.`);
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

    res.redirect('/restaurante/menus');
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
        { menuId: null },
        { menuId: menu._id }
      ],
      restaurantId: req.user._id
    }).populate('category', 'name');

    const dishesInMenu = await Dish.find({ menuId: menu._id }).select('_id');
    const selectedDishIds = dishesInMenu.map(d => d._id.toString());

    res.render('menus/updateMenu', {
      menu,
      availableDishes,
      selectedDishIds,
      errors: [],
      oldInput: {}
    });
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
      const selectedDishIds = toArray(availableDishes);

      // O limite de 10 pratos conta com os que o menu já tem.
      const alreadyInMenu = await Dish.countDocuments({ menuId: menu._id });
      const newOnes = await Dish.countDocuments({
        _id: { $in: selectedDishIds },
        restaurantId: req.user._id,
        $or: [{ menuId: null }, { menuId: { $exists: false } }]
      });
      if (alreadyInMenu + newOnes > MAX_DISHES_PER_MENU) {
        return res.status(400).send(`Um menu pode ter no máximo ${MAX_DISHES_PER_MENU} pratos.`);
      }

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

    res.redirect('/restaurante/menus');
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

    res.redirect('/restaurante/menus');
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

    res.redirect('/restaurante/menus');
  } catch (err) {
    console.error('Erro ao desassociar prato do menu:', err);
    res.status(500).send('Erro ao desassociar prato.');
  }
};

const showEditDishForm = async (req, res) => {
  try {
    const dish = await findOwnDish(req, req.params.id);
    if (!dish) return res.status(404).send('Prato não encontrado.');
    const categories = await Category.find();
    res.render('dishes/updateDish', { categories, dish, errors: [], oldInput: {} });
  } catch (err) {
    console.error('Erro ao buscar prato:', err);
    res.status(500).send('Erro ao buscar prato.');
  }
};

const updateDish = async (req, res) => {
  try {
    const dish = await findOwnDish(req, req.params.id);
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

    dish.pricePerDose = buildPricePerDose(dose, price);

    if (req.file) {
      dish.image = `/uploads/dishes/${req.file.filename}`;
    }

    await dish.save();
    res.redirect('/restaurante/pratos');
  } catch (err) {
    console.error('Erro ao atualizar prato:', err);
    res.status(500).send('Erro ao atualizar prato.');
  }
};

const deleteDish = async (req, res) => {
  try {
    const dish = await findOwnDish(req, req.params.id);
    if (!dish) return res.status(404).send('Prato não encontrado.');

    await dish.deleteOne();
    res.redirect('/restaurante/pratos');
  } catch (err) {
    console.error('Erro ao remover prato:', err);
    res.status(500).send('Erro ao remover prato.');
  }
};

const showAddDishForm = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render('dishes/createDish', { categories, errors: [], oldInput: {} });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar formulário', error: error.message });
  }
};

const addDish = async (req, res) => {
  try {
    const { name, description, category, dose, price } = req.body;
    const image = req.file ? `/uploads/dishes/${req.file.filename}` : null;

    const nutritionData = await fetchOpenFoodData(name);

    const pricePerDose = buildPricePerDose(dose, price);

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

    res.redirect('/restaurante/pratos');
  } catch (err) {
    console.error('Erro ao criar prato:', err);
    res.status(500).send('Erro ao criar prato.');
  }
};

const listDishes = async (req, res) => {
  try {
    const dishes = await Dish.find({ restaurantId: req.user._id }).populate('category', 'name');
    res.render('dishes/readDishes', { dishes });
  } catch (err) {
    console.error('Erro ao listar pratos:', err);
    res.status(500).send('Erro ao listar pratos.');
  }
};

const showDishDetails = async (req, res) => {
  try {
    const dish = await Dish.findOne({ _id: req.params.id, restaurantId: req.user._id }).populate('category', 'name');
    if (!dish) return res.status(404).send('Prato não encontrado.');

    const nutriInfo = dish.nutriInfo || null;

    res.render('dishes/showDish', { dish, nutriInfo });
  } catch (err) {
    console.error('Erro ao carregar detalhes do prato:', err);
    res.status(500).send('Erro ao carregar detalhes do prato.');
  }
};

const listReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ restaurantId: req.user._id }).populate('userId', 'name');
    res.render('reviews/readReviews', { reviews });
  } catch (err) {
    console.error('Erro ao listar avaliações:', err);
    res.status(500).send('Erro ao listar avaliações.');
  }
};

module.exports = wrapAll({
  showRestaurantDashboard,
  listMenus,
  searchMenus,
  showAddMenuForm,
  addMenu,
  showEditMenuForm,
  updateMenu,
  deleteMenu,
  removeDishFromMenu,
  showEditDishForm,
  updateDish,
  deleteDish,
  showAddDishForm,
  addDish,
  listDishes,
  showDishDetails,
  listReviews
});
