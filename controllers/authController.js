const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userRegister = async (req, res) => {
    const { name, username, email, password, birthDate, address, phone, nif } = req.body;
    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;
    const userType = "customer";

    try {
        const existinguser = await User.findOne({ $or: [{ email }, { username }] });
        if (existinguser) {
            return res.status(400).json({ message: "Email ou username já em uso!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newuser = new User({
            name,
            username,
            email,
            password: hashedPassword,
            birthDate,
            address,
            phone,
            nif,
            profilePicture,
            userType
        });

        await newuser.save();
        res.status(201).json({ message: "Utilizador registado com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao registar o utilizador", error: error.message });
    }
};

const restaurantRegister = async (req, res) => {
    const { name, username, email, password, address, phone, nif } = req.body;
    const logo = req.file ? `/uploads/${req.file.filename}` : null;
    const userType = "restaurant";

    try {
        const existingRestaurant = await Restaurant.findOne({ $or: [{ email }, { username }] });
        if (existingRestaurant) {
            return res.status(400).json({ message: "Email ou username já em uso!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newRestaurant = new Restaurant({
            name,
            address,
            phone,
            nif,
            username,
            email,
            logo,
            userType,
            password: hashedPassword
        });

        await newRestaurant.save();
        res.status(201).json({ message: "Restaurante registado com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao registar o restaurante", error: error.message });
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

        if (!foundUser) return res.status(400).json({ message: "Utilizador não encontrado!" });

        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) return res.status(400).json({ message: "Password incorreta!" });

        const token = jwt.sign(
            { userId: foundUser._id, userType },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
          });

        res.json({ message: "Login bem-sucedido!", token, userType });
  
    } catch (error) {
        res.status(500).json({ message: "Erro ao tentar fazer login", error: error.message });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Logout realizado com sucesso!" });
};

module.exports = { userRegister, restaurantRegister, login, logout };