const { body } = require('express-validator');
const nifIsValid = require('../../utils/nifValidator');

const commonValidations = [
    body('name')
        .notEmpty().withMessage('O nome é obrigatório.')
        .isLength({ max: 50 }).withMessage('O nome deve ter no máximo 50 caracteres.')
        .matches(/^[\p{L}\p{N} .,'-]+$/u).withMessage('O nome contém caracteres inválidos.'),

    body('foundedAt')
        .notEmpty().withMessage('A data de fundação é obrigatória.')
        .isISO8601().withMessage('A data é inválida.')
        .custom((value) => {
            const inputDate = new Date(value);
            const today = new Date();
            if (inputDate > today) {
                throw new Error('A data de fundação não pode ser no futuro.');
            }
            if (inputDate < new Date('1800-01-01')) {
                throw new Error('A data de fundação não pode ser demasiado antiga.');
            }
            return true;
        }),

    body('phone')
        .notEmpty().withMessage('O número de telefone é obrigatório.')
        .matches(/^[29][0-9]{8}$/).withMessage('O número de telefone deve começar por 2 ou 9 e conter 9 dígitos.'),

    body('nif')
        .notEmpty().withMessage('O NIF é obrigatório.')
        .isLength({ min: 9, max: 9 }).withMessage('O NIF deve ter 9 dígitos.')
        .isNumeric().withMessage('O NIF só pode conter números.')
        .custom(nif => {
            if (!nifIsValid(nif)) {
                throw new Error('O NIF não é válido.');
            }
            return true;
        }),

    body('address[street]')
        .notEmpty().withMessage('A rua é obrigatória.')
        .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('A rua deve começar com uma letra maiúscula.'),

    body('address[place]')
        .notEmpty().withMessage('A localidade é obrigatória.')
        .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('A cidade deve começar com uma letra maiúscula.'),

    body('address[district]')
        .notEmpty().withMessage('O distrito é obrigatório.')
        .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('O distrito deve começar com uma letra maiúscula.'),

    body('address[country]')
        .notEmpty().withMessage('O país é obrigatório.')
        .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('O país deve começar com uma letra maiúscula.')
        .isLength({ max: 50 }).withMessage('O país deve ter no máximo 50 caracteres.'),

    body('address[number]')
        .notEmpty().withMessage('O número da porta é obrigatório.')
        .matches(/^[0-9]{1,5}([A-Za-z]|[-/][0-9A-Za-z]{1,3})?$/)
        .withMessage('O número da porta tem um formato inválido.'),

    body('address[floor]')
        .optional({ checkFalsy: true })
        .matches(/^((R\/C)|(RC)|-?[0-9]{1,2}(º)?([A-Za-z]{1,4})?)$/)
        .withMessage('O formato do andar é inválido.'),

    body('address[zipCode]')
        .notEmpty().withMessage('O código postal é obrigatório.')
        .matches(/^\d{4}-\d{3}$/).withMessage('O formato do código postal é inválido. Exemplo válido: 1234-567'),
];

const registrationOnlyValidations = [
    body('username')
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

const updateOnlyValidations = [
    body('username')
        .optional({ checkFalsy: true })
        .isLength({ min: 5, max: 20 }).withMessage('O username deve ter entre 5 e 20 caracteres.')
        .matches(/^\S+$/).withMessage('O username não pode conter espaços.'),

    body('email')
        .optional({ checkFalsy: true })
        .isEmail().withMessage('O email é inválido.')
        .isLength({ max: 50 }).withMessage('O email deve ter no máximo 50 caracteres.'),

    body('password')
        .optional({ checkFalsy: true })
        .isLength({ min: 8, max: 20 }).withMessage('A password deve ter entre 8 e 20 caracteres.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
        .withMessage('A password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.'),
];

const restaurantRegisterValidator = [...commonValidations, ...registrationOnlyValidations];
const restaurantUpdateValidator = [...commonValidations, ...updateOnlyValidations];

module.exports = { restaurantRegisterValidator, restaurantUpdateValidator };