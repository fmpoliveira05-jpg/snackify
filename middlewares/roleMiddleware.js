const isCustomer = (req, res, next) => {
    if (req.user?.userType === 'customer') return next();
    return res.status(403).send('Acesso restrito a clientes!');
};

const isRestaurant = (req, res, next) => {
    if (req.user?.userType === 'restaurant') return next();
    return res.status(403).send('Acesso restrito a restaurantes!');
};

const isAdmin = (req, res, next) => {
    if (req.user?.userType === 'admin') return next();
    return res.status(403).send('Acesso restrito a admins!');
};

module.exports = { isCustomer, isRestaurant, isAdmin };