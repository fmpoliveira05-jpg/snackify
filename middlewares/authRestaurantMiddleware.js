const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurant');

const authenticateRestaurant = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).send('Token não fornecido!');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.userType !== 'restaurant') {
            return res.status(403).send('Acesso negado. Apenas restaurantes têm permissão.');
        }

        const restaurant = await Restaurant.findById(decoded.userId);
        if (!restaurant) {
            return res.status(404).send('Restaurante não encontrado!');
        }

        req.user = restaurant;
        next();
    } catch (err) {
        console.error('Erro de autenticação:', err);
        return res.status(401).send('Token inválido!');
    }
};

module.exports = authenticateRestaurant;