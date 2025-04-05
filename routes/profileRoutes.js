const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/user');
const Restaurant = require('../models/restaurant');

const authenticate = (req, res, next) => {
    const token = req.cookies?.authToken || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Acesso negado!' });


    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Token inválido!' });
    }
};

router.get('/profile', authenticate, async (req, res) => {
    const userId = req.user.userId;
    const userType = req.user.userType;

    try {
        let userData;
        if (userType === 'restaurant') {
            userData = await Restaurant.findById(userId).lean();
        } else {
            userData = await User.findById(userId).lean();
        }

        if (!userData) return res.status(404).json({ message: 'Utilizador não encontrado.' });

        res.json(userData);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar perfil', error: error.message });
    }
});


router.put('/profile', authenticate, async (req, res) => {
    const { name, address, phone, profilePicture } = req.body;
    
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { name, address, phone, profilePicture },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ message: 'Perfil atualizado com sucesso!', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar perfil', error: error.message });
    }
});

router.get('/profilePage', (req, res) => {
    res.render('profile');
});

module.exports = router;