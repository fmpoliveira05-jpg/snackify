const jwt = require('jsonwebtoken');

const checkUser = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization?.split(' ')[1]);

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded.userId,
      userType: decoded.userType,
    };

    const protectedPaths = ['/auth/login', '/auth/registar-cliente', '/auth/registar-restaurante'];

    if (protectedPaths.includes(req.path)) {
      switch (req.user.userType) {
        case 'restaurant':
          return res.redirect('/restaurante/dashboard');
        case 'customer':
          return res.redirect('/cliente/dashboard');
        case 'admin':
          return res.redirect('/admin/validar-restaurantes');
        default:
          return res.redirect('/');
      }
    }
  } catch (err) {
    console.error('Token inválido:', err.message);
  }

  next();
};

module.exports = checkUser;
