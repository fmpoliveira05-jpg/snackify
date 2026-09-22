const { body } = require('express-validator');

const menuValidator = [
  body('title')
    .notEmpty().withMessage('O nome do menu é obrigatório.')
    .isLength({ max: 100 }).withMessage('O nome do menu deve ter no máximo 100 caracteres.'),

  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 }).withMessage('A descrição do menu deve ter no máximo 500 caracteres.'),
];

module.exports = menuValidator;