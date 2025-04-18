const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurant');

const checkUser = async (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    res.locals.user = null;

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = {
            _id: decoded.userId,
            userType: decoded.userType
        };

        if (decoded.userType === 'restaurant') {
            const restaurant = await Restaurant.findById(decoded.userId);
            if (!restaurant || !restaurant.isChecked) {
                return next();
            }
        }

        res.locals.user = user;
        req.user = user;
    } catch (err) {
    }

    next();
};

module.exports = checkUser;