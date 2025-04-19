const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const showCustomerRegisterPage = (req, res) => {
    res.render('auth/customerRegister');
};

const showRestaurantRegisterPage = (req, res) => {
    res.render('auth/restaurantRegister');
};

const customerRegister = async (req, res) => {
    const {
        name,
        username,
        email,
        password,
        birthDate,
        phone,
        nif,
        address: {
            street,
            number,
            floor,
            postalCode,
            city,
            district,
            country,
            coordinates
        }
    } = req.body;

    const latitude = coordinates ? coordinates.latitude : null;
    const longitude = coordinates ? coordinates.longitude : null;

    const profilePicture = req.file ? `/uploads/profilePictures/${req.file.filename}` : null;
    const userType = "customer";

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "Email ou username já em uso!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            username,
            email,
            password: hashedPassword,
            birthDate,
            phone,
            nif,
            profilePicture,
            userType,
            address: {
                street,
                number,
                floor,
                postalCode,
                city,
                district,
                country,
                coordinates: {
                    latitude,
                    longitude
                }
            }
        });

        await newUser.save();
        res.redirect('/auth/login');
    } catch (error) {
        res.status(500).json({ message: "Erro ao registar o utilizador", error: error.message });
    }
};

const restaurantRegister = async (req, res) => {
    const {
        name,
        username,
        email,
        password,
        phone,
        nif,
        foundedAt,
        isChecked,
        address: {
            street,
            number,
            floor,
            postalCode,
            city,
            district,
            country,
            coordinates
        }
    } = req.body;

    const latitude = coordinates ? coordinates.latitude : null;
    const longitude = coordinates ? coordinates.longitude : null;

    const logo = req.file ? `/uploads/logos/${req.file.filename}` : null;

    try {
        const existingRestaurant = await Restaurant.findOne({ $or: [{ email }, { username }] });
        if (existingRestaurant) {
            return res.status(400).json({ message: "Email ou username já em uso!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newRestaurant = new Restaurant({
            name,
            username,
            email,
            password: hashedPassword,
            phone,
            nif,
            foundedAt,
            isChecked,
            logo,
            address: {
                street,
                number,
                floor,
                postalCode,
                city,
                district,
                country,
                coordinates: {
                    latitude,
                    longitude
                }
            }
        });

        await newRestaurant.save();
        res.redirect('/auth/login');
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

const showLoginPage = (req, res) => {
    res.render('auth/login');
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.redirect('/auth/login');
};

module.exports = {
    showCustomerRegisterPage,
    showRestaurantRegisterPage,
    customerRegister,
    restaurantRegister,
    login,
    logout,
    showLoginPage
};