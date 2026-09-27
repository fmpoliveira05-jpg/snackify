const Restaurant = require('../models/restaurant');
const Category = require('../models/category');
const { wrapAll } = require('../utils/asyncHandler');
const { parsePagination, setPaginationHeaders } = require('../utils/pagination');

/** Campos de um restaurante que o administrador precisa de ver para o validar. */
const ADMIN_RESTAURANT_FIELDS = 'name username email phone nif address logo foundedAt isChecked createdAt emailVerified';

/** Lista paginada de restaurantes com o estado de validação indicado. */
const listRestaurantsByState = async (req, res, isChecked) => {
  const pagination = parsePagination(req.query);
  const filter = { isChecked };
  const [restaurants, total] = await Promise.all([
    Restaurant.find(filter).select(ADMIN_RESTAURANT_FIELDS).sort({ name: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Restaurant.countDocuments(filter),
  ]);
  setPaginationHeaders(res, { total, ...pagination });
  return res.json(restaurants);
};

/**
 * GET /admin/validar-restaurantes — restaurantes registados que aguardam validação.
 */
const showPendingRestaurants = async (req, res) => {
  try {
    return await listRestaurantsByState(req, res, false);
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter restaurantes por validar." });
  }
};

/**
 * GET /admin/listar-restaurantes-validados — restaurantes já validados.
 */
const showCheckedRestaurants = async (req, res) => {
  try {
    return await listRestaurantsByState(req, res, true);
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter restaurantes validados." });
  }
};

/**
 * POST /admin/validar-restaurante/:id — aprova o restaurante, que passa a poder entrar e a aparecer aos clientes.
 */
const validateRestaurant = async (req, res) => {
  try {
    await Restaurant.findByIdAndUpdate(req.params.id, { isChecked: true });
    res.json({ message: "Restaurante validado com sucesso" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao validar restaurante." });
  }
};

/**
 * POST /admin/rejeitar-restaurante/:id — recusa um pedido de registo (o restaurante é apagado).
 */
const rejectRestaurant = async (req, res) => {
    try {
        await Restaurant.findByIdAndDelete(req.params.id);
        res.json({ message: "Restaurante rejeitado com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao rejeitar restaurante." });
    }
};

/**
 * GET /admin/listar-categorias — todas as categorias de pratos.
 */
const showCategories = async (req, res) => {
    try {
        const categorias = await Category.find().sort({ name: 1 }).limit(500).lean();
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter categorias." });
    }
};

/**
 * POST /admin/editar-categorias — cria uma categoria de pratos (o nome é único).
 */
const createCategory = async (req, res) => {
  const { name } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ message: "Nome da categoria é obrigatório" });
    }
    await Category.create({ name });
    res.status(201).json({ message: "Categoria criada com sucesso" });
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar categoria." });
  }
};

/**
 * DELETE /admin/remover-restaurante/:id — remove definitivamente um restaurante.
 */
const deleteRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurante não encontrado" });
        }
        res.json({ message: "Restaurante removido com sucesso" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover restaurante." });
    }
}

/**
 * DELETE /admin/remover-categoria/:id — remove uma categoria de pratos.
 */
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Categoria não encontrada" });
        }
        res.json({ message: "Categoria removida com sucesso" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover categoria." });
    }
}

/**
 * POST /admin/desativar-restaurante/:id — retira a validação ao restaurante, sem o apagar.
 */
const disableRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, { isChecked: false });
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurante não encontrado" });
        }
        res.json({ message: "Restaurante desativado com sucesso" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao desativar restaurante." });
    }
};

module.exports = wrapAll({
    showPendingRestaurants,
    showCheckedRestaurants,
    validateRestaurant,
    rejectRestaurant,
    showCategories,
    createCategory,
    deleteCategory,
    deleteRestaurant,
    disableRestaurant
});
