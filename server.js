const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

dotenv.config();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado ao MongoDB Atlas'))
    .catch((err) => console.error('Erro ao conectar ao MongoDB Atlas:', err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/userRegister', (req, res) => {
    res.render('userRegister');
});

app.get('/restaurantRegister', (req, res) => {
    res.render('restaurantRegister');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/userDashboard', (req, res) => {
    res.render('userDashboard');
});

app.get('/restaurantDashboard', (req, res) => {
    res.render('restaurantDashboard');
});

app.get('/profilepage', (req, res) => {
    res.render('profile');
});

app.use('/auth', authRoutes);
app.use('/user', profileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});