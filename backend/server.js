const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const cors = require('cors');
const { swaggerUi, swaggerSpec } = require('./swagger');
const methodOverride = require('method-override');

const dotenv = require('dotenv');
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const registerRoutes = require('./routes/registerRoutes');
const checkUser = require('./middlewares/checkUserMiddleware');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();

const server = http.createServer(app);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(methodOverride('_method'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado ao MongoDB Atlas'))
    .catch((err) => console.error('Erro ao conectar ao MongoDB Atlas:', err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(checkUser);

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.user = req.user;
    next();
});

app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
});

app.get('/', authMiddleware, (req, res) => {
    res.render('index');
});

app.use('/auth', authRoutes);
app.use('/user', profileRoutes);
app.use('/admin', adminRoutes);
app.use('/cliente/api', customerRoutes);
app.use('/restaurante', restaurantRoutes);
app.use('/register', registerRoutes);

const angularDistPath = path.join(__dirname, '..', 'frontend-angular', 'angular', 'angular', 'dist', 'angular', 'browser');
app.use(express.static(angularDistPath));
app.get('*', (req, res, next) => {
  if (req.path.match(/\.[^\/]+$/)) {
    return next();
  }

  const isApiRoute =
    req.path.startsWith('/auth') ||
    req.path.startsWith('/user/api') ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/cliente/api') ||
    req.path.startsWith('/restaurante') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/register');

  if (isApiRoute) {
    return next();
  }

  res.sendFile(path.join(angularDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});