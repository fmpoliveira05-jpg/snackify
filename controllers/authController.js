const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const { name, username, email, password, birthDate, date, address, phone } = req.body;
    const userType = req.body.userType || (req.originalUrl.includes('restaurant') ? 'restaurant' : 'customer');

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "E-mail ou username já em uso!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            username,
            email,
            password: hashedPassword,
            birthDate,
            date,
            address,
            phone,
            userType
        });

        console.log(req.body);

        await newUser.save();
        res.status(201).json({ message: "Utilizador registado com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao registar o utilizador", error: error.message });
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

module.exports = { register, login };