const { body } = require('express-validator');
const nifIsValid = require('../../utils/nifValidator');

const customerValidationRules = [
    body('name').trim().notEmpty().withMessage('O nome é obrigatório.'),

    body('username')
        .trim()
        .notEmpty().withMessage('O username é obrigatório.')
        .isLength({ max: 20 }).withMessage('O username deve ter no máximo 20 caracteres.')
        .matches(/^\S+$/).withMessage('O username não pode conter espaços.'),

    body('email').isEmail().withMessage('O email é inválido.'),

    body('password')
    .notEmpty().withMessage('A password é obrigatória.')
    .isLength({ min: 8, max: 20 }).withMessage('A password deve ter pelo menos 8 caracteres e no máximo 20 caracteres.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage('A password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.'),

    body('phone')
        .isLength({ min: 9, max: 9 }).withMessage('O número de telemóvel deve ter 9 dígitos.')
        .isNumeric().withMessage('O número de telemóvel só pode conter números.'),

    body('nif')
    .isLength({ min: 9, max: 9 }).withMessage('O NIF deve ter 9 dígitos.')
    .isNumeric().withMessage('O NIF só pode conter números.')
    .custom(nif => {
        if (!nifIsValid(nif)) {
            throw new Error('O NIF não é válido.');
        }

        return true;
    }),

    body('birthDate')
    .isISO8601().toDate().withMessage('A data de nascimento é inválida.')
    .custom((value) => {
        const today = new Date();
        const birthDate = new Date(value);

        const ageDiffMs = today - birthDate;
        const ageDate = new Date(ageDiffMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);

        if (birthDate > today) {
            throw new Error('A data de nascimento não pode ser no futuro.');
        }

        if (age < 18) {
            throw new Error('É necessário ter pelo menos 18 anos.');
        }

        if (age > 120) {
            throw new Error('A idade é demasiado elevada para ser válida.');
        }

        return true;
    }),

    body('address.street')
        .optional({ checkFalsy: true })
        .notEmpty().withMessage('A rua é obrigatória.'),
    body('address.city')
        .optional({ checkFalsy: true })
        .notEmpty().withMessage('A cidade é obrigatória.'),
    body('address.district')
        .optional({ checkFalsy: true })
        .notEmpty().withMessage('O distrito é obrigatório.'),
    body('address.country')
        .optional({ checkFalsy: true })
        .notEmpty().withMessage('O país é obrigatório.'),
    body('address.number')
        .optional({ checkFalsy: true })
        .notEmpty().withMessage('O número da porta é obrigatório.')
        .isNumeric().withMessage('O número da porta só pode conter números.'),
    body('address.zipCode')
        .optional({ checkFalsy: true })
        .notEmpty().withMessage('O código postal é obrigatório.')
        .matches(/^\d{4}-\d{3}$/).withMessage('O formato do código postal é inválido. Exemplo válido: 1234-567')
];

module.exports = customerValidationRules;