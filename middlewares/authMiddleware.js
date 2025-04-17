const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurant');

const authMiddleware = async (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Token não fornecido!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.userType === 'restaurant') {
            const restaurant = await Restaurant.findById(decoded.userId);
            if (!restaurant || !restaurant.isChecked) {
                return res.status(403).json({ message: "Restaurante não validado!" });
            }
        }

        req.user = {
            _id: decoded.userId,
            userType: decoded.userType
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token inválido!" });
    }
};

module.exports = authMiddleware;