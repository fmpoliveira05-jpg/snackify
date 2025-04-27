const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');

const dotenv = require('dotenv');
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const checkUser = require('./middlewares/checkUserMiddleware');

const app = express();

const server = http.createServer(app);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    next();
});

app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.render('index');
});

app.use('/auth', authRoutes);
app.use('/user', profileRoutes);
app.use('/admin', adminRoutes);
app.use('/cliente', customerRoutes);
app.use('/restaurante', restaurantRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});