const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const methodOverride = require('method-override');

const { config } = require('./config/env');
const { swaggerUi, swaggerSpec } = require('./swagger');
const { loadUser, redirectIfAuthenticated } = require('./middlewares/authMiddleware');
const errorHandler = require('./middlewares/errorHandler');
const { notFound, blockSourceMaps } = require('./middlewares/notFound');
const { invalidateCatalogOnSuccess } = require('./services/catalogCache');
const { noStore, staticCacheHeaders } = require('./middlewares/cacheHeaders');
const { verifyOrigin } = require('./middlewares/csrfMiddleware');
const { apiLimiter } = require('./middlewares/rateLimiters');
const { cspNonce, helmetMiddleware, permissionsPolicy, forceHttps } = require('./middlewares/securityHeaders');

const healthRoutes = require('./routes/healthRoutes');
const stripeWebhookRoutes = require('./routes/stripeWebhookRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const registerRoutes = require('./routes/registerRoutes');

// Filtros de pesquisa vindos do pedido nunca são interpretados como operadores do MongoDB
// (ex.: {"username": {"$ne": null}} no login), o que previne injeção NoSQL.
mongoose.set('sanitizeFilter', true);

const BODY_LIMIT = '100kb';
/** Build de produção do cliente Angular (servido pelo próprio Express). */
const DEFAULT_ANGULAR_DIST = path.join(__dirname, '..', 'frontend', 'dist', 'angular', 'browser');
const API_PREFIXES = ['/auth', '/user', '/admin', '/cliente/api', '/restaurante', '/register', '/api'];

/** Ficheiros enviados pelos utilizadores: nunca são interpretados como página nem executados. */
const setUploadHeaders = (res, filePath) => {
  staticCacheHeaders('uploads')(res, filePath);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Content-Disposition', 'inline');
};

/**
 * Cria a aplicação Express sem a pôr à escuta nem ligar à base de dados,
 * o que permite testá-la com o supertest.
 */
function createApp({ angularDist = DEFAULT_ANGULAR_DIST } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Número de proxies de confiança (req.ip e req.secure corretos atrás de um proxy).
  app.set('trust proxy', config.trustProxy);

  // Verificações de saúde: antes do HTTPS obrigatório, dos limites de pedidos e dos registos.
  app.use(healthRoutes);

  app.use(forceHttps);
  // Em produção não se publicam source maps (nem do Angular nem de outra coisa qualquer).
  app.use(blockSourceMaps);
  app.use(cspNonce);
  app.use(helmetMiddleware());
  app.use(permissionsPolicy);
  app.use(cors({ origin: config.clientUrl, credentials: true, exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size'] }));

  if (config.env === 'development') {
    // Só o caminho: a query string pode ter tokens (ex.: links de verificação).
    app.use((req, res, next) => {
      console.log(`[${req.method}] ${req.path}`);
      next();
    });
  }

  app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'ignore', setHeaders: staticCacheHeaders('public') }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    dotfiles: 'deny',
    index: false,
    redirect: false,
    setHeaders: setUploadHeaders,
  }));
  if (config.enableApiDocs) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Nada da API nem do back-office fica em cache (dados pessoais e da sessão).
  app.use(API_PREFIXES, noStore);
  app.use(API_PREFIXES, apiLimiter);

  // O webhook do Stripe precisa do corpo em bruto para verificar a assinatura: vem antes do express.json.
  app.use(stripeWebhookRoutes);

  app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT, parameterLimit: 200 }));
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(cookieParser());
  app.use(verifyOrigin);
  app.use(methodOverride('_method'));
  app.use(loadUser);
  // Escritas no back-office, na administração ou no perfil podem mudar o catálogo público em cache.
  app.use(['/restaurante', '/admin', '/user'], (req, res, next) => (
    ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : invalidateCatalogOnSuccess(req, res, next)
  ));

  app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    // As páginas EJS apontam para o cliente Angular, que em desenvolvimento corre noutra porta.
    res.locals.clientUrl = config.clientUrl;
    res.locals.turnstileSiteKey = config.turnstileSiteKey;
    next();
  });

  app.get('/', redirectIfAuthenticated, (req, res) => res.render('index'));

  app.use('/auth', authRoutes);
  app.use('/user', profileRoutes);
  app.use('/admin', adminRoutes);
  app.use('/cliente/api', customerRoutes);
  app.use('/restaurante', restaurantRoutes);
  app.use('/register', registerRoutes);

  // Em produção, o cliente Angular compilado pode ser servido pelo próprio Express.
  // O build não tem scripts inline (ver angular.json), por isso funciona com a CSP "script-src 'self'".
  app.use(express.static(angularDist, { index: false, dotfiles: 'ignore', setHeaders: staticCacheHeaders('angular') }));
  const spaExcluded = ['/auth', '/user/api', '/admin', '/cliente/api', '/restaurante', '/uploads', '/register', '/api-docs', '/api/', '/health'];
  app.get('*', (req, res, next) => {
    if (/\.[^/]+$/.test(req.path) || spaExcluded.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(path.join(angularDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
