const Restaurant = require('../models/restaurant');

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

module.exports = {
    showPendingRestaurants,
    validateRestaurant
};
