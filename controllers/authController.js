const user = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const restaurants = require('../models/restaurant');

const registerUser = async (req, res) => {
    const { name, username, email, password, birthDate, address, phone } = req.body;

    const userType= "customer";

    try {
        const existinguser = await user.findOne({ $or: [{ email }, { username }] });
        if (existinguser) {
            return res.status(400).json({ message: "E-mail ou username já em uso!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newuser = new user({
            name,
            username,
            email,
            password: hashedPassword,
            birthDate,
            address,
            phone,
            userType
            
        });

        console.log(req.body);

        await newuser.save();
        res.status(201).json({ message: "Utilizador registado com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao registar o utilizador", error: error.message });
    }
};

const registerRestaurant = async (req, res) => {
    const { name, username, email, password, birthDate, address, phone, nif } = req.body;

    try {
        const existingRestaurant = await restaurants.findOne({ $or: [{ email }, { username }] });
        if (existingRestaurant) {
            return res.status(400).json({ message: "E-mail ou username já em uso!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newRestaurant = new restaurants({
            name,
            address,
            phone,
            nif,
            username,
            email,
            password: hashedPassword
        });

        console.log(req.body);

        await newRestaurant.save();
        res.status(201).json({ message: "Restaurante registado com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao registar o restaurante", error: error.message });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: "Utilizador não encontrado!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Password incorreta!" });

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: "Login bem-sucedido!", token });
    } catch (error) {
        res.status(500).json({ message: "Erro ao tentar fazer login", error: error.message });
    }
};

/*
exports.login = (req, res) => {
    const { username } = req.body;

    if (username) {

        res.cookie("user", username, { maxAge: 900000, httpOnly: true });
        res.send("Login bem-sucedido! Cookie criado.");
    } else {
        res.status(400).send("Nome de usuário necessário.");
    }
};
*/
module.exports = { registerUser, login, registerRestaurant };