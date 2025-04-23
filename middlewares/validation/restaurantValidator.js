const { body } = require('express-validator');
const nifIsValid = require('../../utils/nifValidator');

const restaurantValidator = [
    body('name')
        .notEmpty().withMessage('O nome é obrigatório.')
        .isLength({ max: 50 }).withMessage('O nome deve ter no máximo 50 caracteres.'),

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
        .isLength({ min: 9, max: 9 }).withMessage('O número de telefone deve ter 9 dígitos.')
        .isNumeric().withMessage('O número de telefone só pode conter números.'),

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

    body('username')
        .notEmpty().withMessage('O username é obrigatório.')
        .isLength({ max: 20 }).withMessage('O username deve ter no máximo 20 caracteres.')
        .matches(/^\S+$/).withMessage('O username não pode conter espaços.'),

    body('email')
        .notEmpty().withMessage('O email é obrigatório.')
        .isEmail().withMessage('O email é inválido.'),

    body('password')
    .notEmpty().withMessage('A password é obrigatória.')
    .isLength({ min: 8, max: 20 }).withMessage('A password deve ter pelo menos 8 caracteres e no máximo 20 caracteres.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage('A password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.'),

    body('address.street')
        .notEmpty().withMessage('A rua é obrigatória.'),
    body('address.number')
        .notEmpty().withMessage('O número da porta é obrigatório.')
        .isNumeric().withMessage('O número da porta só pode conter números.'),
    body('address.zipCode')
        .notEmpty().withMessage('O código postal é obrigatório.')
        .matches(/^\d{4}-\d{3}$/).withMessage('O formato do código postal é inválido. Exemplo válido: 1234-567'),
    body('address.city')
        .notEmpty().withMessage('A cidade é obrigatória.'),
    body('address.district')
        .notEmpty().withMessage('O distrito é obrigatório.'),
    body('address.country')
        .notEmpty().withMessage('O país é obrigatório.')
];

module.exports = restaurantValidator;