const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const bcrypt = require('bcryptjs');
const { wrapAll } = require('../utils/asyncHandler');

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,20}$/;
const PASSWORD_MESSAGE = 'A password deve ter entre 8 e 20 caracteres e conter uma letra maiúscula, uma minúscula, um número e um caractere especial.';

/**
 * O login procura o username primeiro nos clientes e depois nos restaurantes, por isso
 * username e email têm de ser únicos nas duas coleções ao mesmo tempo.
 */
const isTaken = async ({ username, email }) => {
  const filter = { $or: [{ email }, { username }] };
  const [user, restaurant] = await Promise.all([User.exists(filter), Restaurant.exists(filter)]);
  return Boolean(user || restaurant);
};

const showCustomerRegisterPage = (req, res) => {
    if (req.user) {
        if (req.accepts('html')) return res.redirect('/user/perfil');
        return res.status(403).json({ message: 'Já está autenticado.' });
    }
    res.render('auth/customerRegister', {
        errors: [],
        oldInput: {}
    });
};

const showRestaurantRegisterPage = (req, res) => {
    if (req.user) {
        if (req.accepts('html')) return res.redirect('/user/perfil');
        return res.status(403).json({ message: 'Já está autenticado.' });
    }
    res.render('auth/restaurantRegister', {
        errors: [],
        oldInput: {}
    });
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
    address = {}
  } = req.body;
  const { street, number, floor, zipCode, place, district, country, coordinates } = address;

  const latitude = coordinates?.latitude || null;
  const longitude = coordinates?.longitude || null;
  const profilePicture = req.file ? `/uploads/profilePictures/${req.file.filename}` : null;
  const userType = "customer";

  try {
    if (typeof password !== 'string' || !PASSWORD_RULE.test(password)) {
      return res.status(400).json({ message: PASSWORD_MESSAGE });
    }

    if (await isTaken({ username, email })) {
      return res.status(400).json({ message: "Email ou username já em uso!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
        zipCode,
        place,
        district,
        country,
        coordinates: { latitude, longitude }
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
        address = {}
    } = req.body;
    const { street, number, floor, zipCode, place, district, country, coordinates } = address;

    const latitude = coordinates?.latitude || null;
    const longitude = coordinates?.longitude || null;
    const logo = req.file ? `/uploads/logos/${req.file.filename}` : null;

    try {
        if (typeof password !== 'string' || !PASSWORD_RULE.test(password)) {
            return res.status(400).json({ message: PASSWORD_MESSAGE });
        }

        if (await isTaken({ username, email })) {
            return res.status(400).json({ message: "Email ou username já em uso!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newRestaurant = new Restaurant({
            name,
            username,
            email,
            password: hashedPassword,
            phone,
            nif,
            foundedAt,
            // Um restaurante novo fica sempre por validar: só um administrador o pode aprovar.
            isChecked: false,
            logo,
            address: {
                street,
                number,
                floor,
                zipCode,
                place,
                district,
                country,
                coordinates: { latitude, longitude }
            }
        });

        await newRestaurant.save();
        res.redirect('/auth/login');
    } catch (error) {
        res.status(500).json({ message: "Erro ao registar o restaurante", error: error.message });
    }
};

module.exports = wrapAll({
    showCustomerRegisterPage,
    showRestaurantRegisterPage,
    customerRegister,
    restaurantRegister
});
