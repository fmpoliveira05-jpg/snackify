const Restaurant = require('../models/restaurant');
const Category = require('../models/category');

const showPendingRestaurants = async (req, res) => {
    try {
        const restaurantes = await Restaurant.find({ isChecked: false });
        res.render('admin/validateRestaurants', { restaurantes });
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter restaurantes por validar", error: error.message });
    }
};

const validateRestaurant = async (req, res) => {
    try {
        await Restaurant.findByIdAndUpdate(req.params.id, { isChecked: true });
        res.redirect('/admin/validar-restaurantes');
    } catch (error) {
        res.status(500).json({ message: "Erro ao validar restaurante", error: error.message });
    }
};

const rejectRestaurant = async (req, res) => {
    try {
        await Restaurant.findByIdAndDelete(req.params.id);
        res.redirect('/admin/validar-restaurantes');
    } catch (error) {
        res.status(500).json({ message: "Erro ao rejeitar restaurante", error: error.message });
    }
}

const showRestaurantDetails = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurante não encontrado" });
        }
        res.render('admin/restaurantDetails', { restaurant });
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter detalhes do restaurante", error: error.message });
    }
}

const showRestaurantEditPage = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurante não encontrado" });
        }
        res.render('admin/editRestaurant', { restaurant });
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter detalhes do restaurante", error: error.message });
    }
}

const updateRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurante não encontrado" });
        }
        res.redirect('/admin/validar-restaurantes');
    }
    catch (error) {
        res.status(500).json({ message: "Erro ao atualizar restaurante", error: error.message });
    }
}

const removeRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurante não encontrado" });
        }
        res.redirect('/admin/validar-restaurantes');
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover restaurante", error: error.message });
    }
}

const showCategories = async (req, res) => {
    try {
        const categorias = await Category.find({ isChecked: false });
        res.render('admin/editCategories', { categorias });
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter categorias", error: error.message });
    }
};

const createCategory = async (req, res) => {
    const { name } = req.body;
    try {
        if (!name){ return res.status(404).json({ message: "Categoria já existe" });}
        await Category.create({ name });
        res.redirect('/admin/editar-categorias');
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar categoria", error: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Categoria não encontrada" });
        }
        res.redirect('/admin/editar-categorias');
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover categoria", error: error.message });
    }
}

const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Pedido não encontrado" });
        }
        res.redirect('/admin/remover-pedido');
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover pedido", error: error.message });
    }
}

const showOrders = async (req, res) => {
    try {
        const orders = await Order.find({});
        res.render('admin/orders', { orders });
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter pedidos", error: error.message });
    }
}

const showOrderDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('restaurant');
        if (!order) {
            return res.status(404).json({ message: "Pedido não encontrado" });
        }
        res.render('admin/orderDetails', { order });
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter detalhes do pedido", error: error.message });
    }
}




module.exports = {
    showPendingRestaurants,
    validateRestaurant,
    rejectRestaurant,
    showRestaurantDetails,
    showRestaurantEditPage,
    updateRestaurant,
    removeRestaurant,
    showCategories,
    createCategory,
    deleteCategory,
    deleteOrder,
    showOrders,
    showOrderDetails
};
