const Restaurant = require('../models/restaurant');
const Category = require('../models/category');
const { wrapAll } = require('../utils/asyncHandler');

/**
 * GET /admin/validar-restaurantes — restaurantes registados que aguardam validação.
 */
const showPendingRestaurants = async (req, res) => {
  try {
    const restaurantes = await Restaurant.find({ isChecked: false });
    res.json(restaurantes);
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter restaurantes por validar", error: error.message });
  }
};

/**
 * GET /admin/listar-restaurantes-validados — restaurantes já validados.
 */
const showCheckedRestaurants = async (req, res) => {
  try {
    const restaurantes = await Restaurant.find({ isChecked: true });
    res.json(restaurantes);
  } catch (error) {
    res.status(500).json({ message: "Erro ao obter restaurantes validados", error: error.message });
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
    res.status(500).json({ message: "Erro ao validar restaurante", error: error.message });
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
        res.status(500).json({ message: "Erro ao rejeitar restaurante", error: error.message });
    }
};

/**
 * GET /admin/listar-categorias — todas as categorias de pratos.
 */
const showCategories = async (req, res) => {
    try {
        const categorias = await Category.find();
        res.json(categorias); 
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter categorias", error: error.message });
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
    res.status(500).json({ message: "Erro ao criar categoria", error: error.message });
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
        res.status(500).json({ message: "Erro ao remover restaurante", error: error.message });
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
        res.status(500).json({ message: "Erro ao remover categoria", error: error.message });
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
        res.status(500).json({ message: "Erro ao desativar restaurante", error: error.message });
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
