const { body } = require('express-validator');
const nifIsValid = require('../../utils/nifValidator');

const customerUpdateValidator = [
    body('name')
    .trim()
    .notEmpty().withMessage('O nome é obrigatório.')
    .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+(?: [A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+)+$/)
    .withMessage('O nome deve conter pelo menos dois nomes próprios com iniciais maiúsculas.'),

    body('username')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 20 }).withMessage('O username deve ter no máximo 20 caracteres.')
    .matches(/^\S+$/).withMessage('O username não pode conter espaços.'),

    body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('O email é inválido.'),

    body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 8, max: 20 }).withMessage('A password deve ter pelo menos 8 caracteres e no máximo 20 caracteres.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage('A password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.'),

    body('phone')
    .notEmpty().withMessage('O número de telemóvel é obrigatório.')
    .isLength({ min: 9, max: 9 }).withMessage('O número de telemóvel deve ter 9 dígitos.')
    .isNumeric().withMessage('O número de telemóvel só pode conter números.'),

    body('nif')
    .optional({ checkFalsy: true })
    .custom((nif, { req }) => {
        const userType = req.user?.userType;
    
        if (!nif && userType === 'customer') {
        return true;
        }
    
        if (!/^\d{9}$/.test(nif)) {
        throw new Error('O NIF deve ter 9 dígitos numéricos.');
        }
    
        if (!nifIsValid(nif)) {
        throw new Error('O NIF não é válido.');
        }
    
        return true;
    }),      

    body('birthDate')
    .optional({ checkFalsy: true })
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
    .matches(/^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/).withMessage('O país deve começar com uma letra maiúscula.'),

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

module.exports = customerUpdateValidator;