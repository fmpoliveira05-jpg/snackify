const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const methodOverride = require('method-override');

const { config } = require('./config/env');
const { swaggerUi, swaggerSpec } = require('./swagger');
const { loadUser, redirectIfAuthenticated } = require('./middlewares/authMiddleware');
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const registerRoutes = require('./routes/registerRoutes');

// Filtros de pesquisa vindos do pedido nunca são interpretados como operadores do MongoDB
// (ex.: {"username": {"$ne": null}} no login), o que previne injeção NoSQL.
mongoose.set('sanitizeFilter', true);

/**
 * Cria a aplicação Express sem a pôr à escuta nem ligar à base de dados,
 * o que permite testá-la com o supertest.
 */
function createApp() {
  const app = express();

  // As páginas EJS usam scripts inline e o Google Charts; a CSP fica desligada para não os bloquear.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientUrl, credentials: true }));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(methodOverride('_method'));
  app.use(cookieParser());
  app.use(loadUser);

  app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    // As páginas EJS apontam para o cliente Angular, que em desenvolvimento corre noutra porta.
    res.locals.clientUrl = config.clientUrl;
    next();
  });

  if (config.env === 'development') {
    app.use((req, res, next) => {
      console.log(`[${req.method}] ${req.originalUrl}`);
      next();
    });
  }

  app.get('/', redirectIfAuthenticated, (req, res) => res.render('index'));

  app.use('/auth', authRoutes);
  app.use('/user', profileRoutes);
  app.use('/admin', adminRoutes);
  app.use('/cliente/api', customerRoutes);
  app.use('/restaurante', restaurantRoutes);
  app.use('/register', registerRoutes);

  // Em produção, o cliente Angular compilado pode ser servido pelo próprio Express.
  const angularDist = path.join(__dirname, '..', 'frontend', 'dist', 'angular', 'browser');
  app.use(express.static(angularDist));
  const apiPrefixes = ['/auth', '/user/api', '/admin', '/cliente/api', '/restaurante', '/uploads', '/register', '/api-docs'];
  app.get('*', (req, res, next) => {
    if (/\.[^/]+$/.test(req.path) || apiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }
    return res.sendFile(path.join(angularDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use((req, res) => res.status(404).json({ message: 'Recurso não encontrado.' }));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
