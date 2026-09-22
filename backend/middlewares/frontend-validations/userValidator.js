const { body } = require('express-validator');
const nifIsValid = require('../../utils/nifValidator');

const commonValidations = [
  body('name')
    .trim()
    .notEmpty().withMessage('O nome é obrigatório.')
    .isLength({ max: 50 }).withMessage('O nome deve ter no máximo 50 caracteres.')
    .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+(?: [A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+)+$/)
    .withMessage('O nome deve conter pelo menos dois nomes próprios com iniciais maiúsculas.'),

  body('phone')
    .notEmpty().withMessage('O número de telefone é obrigatório.')
    .matches(/^[29][0-9]{8}$/).withMessage('O número de telefone deve começar por 2 ou 9 e conter 9 dígitos.'),

  body('nif')
    .optional({ checkFalsy: true })
    .isLength({ min: 9, max: 9 }).withMessage('O NIF deve ter 9 dígitos.')
    .isNumeric().withMessage('O NIF deve conter apenas números.')
    .custom((nif, { req }) => {
      const userType = req.user?.userType;
      if (!nif && userType === 'customer') return true;
      if (!nifIsValid(nif)) throw new Error('O NIF não é válido.');
      return true;
    }),

  body('birthDate')
    .isISO8601().toDate().withMessage('A data de nascimento é inválida.')
    .custom((value) => {
      const today = new Date();
      const birthDate = new Date(value);
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

      if (birthDate > today) throw new Error('A data de nascimento não pode ser no futuro.');
      if (age < 18) throw new Error('É necessário ter pelo menos 18 anos.');
      if (age > 120) throw new Error('A idade é demasiado elevada para ser válida.');
      return true;
    }),

  // Address
  body('address[street]')
    .notEmpty().withMessage('A rua é obrigatória.')
    .isLength({ max: 50 }).withMessage('A rua deve ter no máximo 50 caracteres.')
    .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('A rua deve começar com letra maiúscula.'),

  body('address[number]')
    .notEmpty().withMessage('O número da porta é obrigatório.')
    .isLength({ max: 10 }).withMessage('O número da porta deve ter no máximo 10 caracteres.')
    .isNumeric().withMessage('O número da porta deve conter apenas números.'),

  body('address[floor]')
    .optional({ checkFalsy: true })
    .isLength({ max: 10 }).withMessage('O andar deve ter no máximo 10 caracteres.')
    .isNumeric().withMessage('O andar deve conter apenas números.'),

  body('address[zipCode]')
    .notEmpty().withMessage('O código postal é obrigatório.')
    .isLength({ max: 8 }).withMessage('O código postal deve ter no máximo 8 caracteres.')
    .matches(/^\d{4}-\d{3}$/).withMessage('O formato do código postal é inválido. Exemplo válido: 1234-567'),

  body('address[place]')
    .notEmpty().withMessage('A localidade é obrigatória.')
    .isLength({ max: 50 }).withMessage('A localidade deve ter no máximo 50 caracteres.')
    .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('A localidade deve começar com letra maiúscula.'),

  body('address[district]')
    .notEmpty().withMessage('O distrito é obrigatório.')
    .isLength({ max: 50 }).withMessage('O distrito deve ter no máximo 50 caracteres.')
    .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('O distrito deve começar com letra maiúscula.'),

  body('address[country]')
    .notEmpty().withMessage('O país é obrigatório.')
    .isLength({ max: 50 }).withMessage('O país deve ter no máximo 50 caracteres.')
    .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('O país deve começar com letra maiúscula.'),
];

const registrationOnlyValidations = [
  body('username')
    .trim()
    .notEmpty().withMessage('O username é obrigatório.')
    .isLength({ min: 5, max: 20 }).withMessage('O username deve ter entre 5 e 20 caracteres.')
    .matches(/^\S+$/).withMessage('O username não pode conter espaços.'),

  body('email')
    .notEmpty().withMessage('O email é obrigatório.')
    .isEmail().withMessage('O email é inválido.')
    .isLength({ max: 50 }).withMessage('O email deve ter no máximo 50 caracteres.'),

  body('password')
    .notEmpty().withMessage('A password é obrigatória.')
    .isLength({ min: 8, max: 20 }).withMessage('A password deve ter entre 8 e 20 caracteres.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage('A password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.'),
];

const customerRegisterValidator = [...commonValidations, ...registrationOnlyValidations];
const customerUpdateValidator = [...commonValidations];

module.exports = { customerRegisterValidator, customerUpdateValidator };