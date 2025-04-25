const { body } = require('express-validator');

const dishValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('O nome do prato é obrigatório.')
    .isLength({ max: 100 }).withMessage('O nome do prato deve ter no máximo 100 caracteres.'),

  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('A descrição do prato deve ter no máximo 500 caracteres.'),

  body('category')
    .notEmpty().withMessage('A categoria é obrigatória.')
    .isIn(['Carne', 'Peixe', 'Vegetariano', 'Sobremesa'])
    .withMessage('Categoria inválida.'),

  body('price')
    .custom((value, { req }) => {
      const prices = req.body.price;
      if (!Array.isArray(prices) || prices.length === 0) {
        throw new Error('É necessário fornecer pelo menos um preço.');
      }

      for (let p of prices) {
        if (isNaN(p) || Number(p) <= 0) {
          throw new Error('Todos os preços devem ser números válidos e maiores que zero.');
        }
      }
      return true;
    }),
];

module.exports = dishValidator;