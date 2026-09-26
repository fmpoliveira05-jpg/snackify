const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const bcrypt = require('bcryptjs');
const { wrapAll } = require('../utils/asyncHandler');
const { config } = require('../config/env');
const { BCRYPT_COST, PASSWORD_MESSAGE, isStrongPassword } = require('../utils/passwordPolicy');
const { issueEmailVerification } = require('./authController');
const { discardUpload } = require('../middlewares/uploadMiddleware');

/** Depois do registo, o utilizador é enviado para a página que lhe pede para confirmar o email. */
const CHECK_EMAIL_URL = () => `${config.clientUrl}/verificar-email/pendente`;
const REGISTERED_MESSAGE = 'Conta criada. Enviámos um email com o link para a confirmar.';

/** Resposta de sucesso: redireciona o formulário EJS; responde em JSON aos pedidos da API. */
const registered = (req, res) => {
  const wantsJson = req.accepts(['html', 'json']) === 'json' || req.xhr;
  if (wantsJson) return res.status(201).json({ message: REGISTERED_MESSAGE });
  return res.redirect(303, CHECK_EMAIL_URL());
};

/**
 * O login procura o username primeiro nos clientes e depois nos restaurantes, por isso
 * username e email têm de ser únicos nas duas coleções ao mesmo tempo.
 */
const isTaken = async ({ username, email }) => {
  const filter = { $or: [{ email }, { username }] };
  const [user, restaurant] = await Promise.all([User.exists(filter), Restaurant.exists(filter)]);
  return Boolean(user || restaurant);
};

/**
 * GET /registar-cliente — formulário de registo de cliente (EJS).
 */
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

/**
 * GET /registar-restaurante — formulário de registo de restaurante (EJS).
 */
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

/**
 * POST /registar-cliente — cria a conta de cliente (password cifrada com bcrypt) depois de validado o formulário.
 */
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
    if (!isStrongPassword(password)) {
      await discardUpload(req);
      return res.status(400).json({ message: PASSWORD_MESSAGE });
    }

    if (await isTaken({ username, email })) {
      await discardUpload(req);
      return res.status(400).json({ message: "Email ou username já em uso!" });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

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
    await issueEmailVerification(User, newUser);
    return registered(req, res);
  } catch (error) {
    await discardUpload(req);
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Dados inválidos.' });
    console.error('[registo] Erro ao registar o cliente:', error.name);
    return res.status(500).json({ message: "Erro ao registar o utilizador." });
  }
};

/**
 * POST /registar-restaurante — cria o restaurante, que fica à espera da validação do administrador.
 */
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
        if (!isStrongPassword(password)) {
            await discardUpload(req);
            return res.status(400).json({ message: PASSWORD_MESSAGE });
        }

        if (await isTaken({ username, email })) {
            await discardUpload(req);
            return res.status(400).json({ message: "Email ou username já em uso!" });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

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
        await issueEmailVerification(Restaurant, newRestaurant);
        return registered(req, res);
    } catch (error) {
        await discardUpload(req);
        if (error.name === 'ValidationError') return res.status(400).json({ message: 'Dados inválidos.' });
        console.error('[registo] Erro ao registar o restaurante:', error.name);
        return res.status(500).json({ message: "Erro ao registar o restaurante." });
    }
};

module.exports = wrapAll({
    showCustomerRegisterPage,
    showRestaurantRegisterPage,
    customerRegister,
    restaurantRegister
});
