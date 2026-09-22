const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Restaurant = require('../models/restaurant');

const checkUser = async (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    res.locals.user = null;

    if (token && req.path === '/') {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            switch (decoded.userType) {
                case 'restaurant':
                    return res.redirect('/restaurante/dashboard');
                case 'customer':
                    return res.redirect('/cliente/dashboard');
                case 'admin':
                    return res.redirect('/user/perfil');
                default:
                    return res.redirect('/');
            }
        } catch (err) {
            console.error('Token inválido:', err.message);
        }
    }

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user;
        if (decoded.userType === 'restaurant') {
            user = await Restaurant.findById(decoded.userId);
            if (!user || !user.isChecked) {
                req.user = null;
                res.locals.user = null;
                return next();
            }
        } else {
            user = await User.findById(decoded.userId);
            if (!user) {
                req.user = null;
                res.locals.user = null;
                return next();
            }
        }

        user.userType = decoded.userType;
        req.user = user;
        res.locals.user = user;

        const loginRoutes = ['/auth/login', '/auth/register-customer', '/auth/register-restaurant'];
        if (loginRoutes.includes(req.path)) {
            if (req.accepts('html')) {
                return res.redirect('/user/perfil');
            } else {
                return res.status(403).json({ message: 'Já está autenticado.' });
            }
        }

    } catch (err) {
        req.user = null;
        res.locals.user = null;
        return next();
    }

    next();
};

module.exports = checkUser;