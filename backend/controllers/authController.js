const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getMe = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Não autenticado' });
    }

    try {
        let userData = null;

        if (req.user.userType === 'restaurant') {
            userData = await Restaurant.findById(req.user._id).select('-password');
        } else {
            userData = await User.findById(req.user._id).select('-password');
        }

        if (!userData) {
            return res.status(404).json({ message: 'Utilizador não encontrado' });
        }

        res.json(userData);

    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter dados do utilizador', error: error.message });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        let foundUser = await User.findOne({ username });
        let userType = "undefined";

        if (!foundUser) {
            foundUser = await Restaurant.findOne({ username });
            userType = "restaurant";
        } else {
            userType = foundUser.userType;
        }

        if (!foundUser) {
            return res.status(400).json({ message: "Utilizador não encontrado!" });
        }

        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Password incorreta!" });
        }

        const token = jwt.sign(
            { userId: foundUser._id, userType },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 3600000
        });

        res.json({ message: "Login bem-sucedido!", token, userType });

    } catch (error) {
        res.status(500).json({ message: "Erro ao tentar fazer login", error: error.message });
    }
};

const showLoginPage = (req, res) => {
    if (req.user) {
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
    res.redirect('http://localhost:5000/login');
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout feito com sucesso' });
};

module.exports = {
    getMe,
    login,
    logout,
    showLoginPage
};