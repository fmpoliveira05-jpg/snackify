const { body } = require('express-validator');
const Category = require('../../models/category');

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
  .custom(async (value) => {
    const categoryExists = await Category.findOne({ _id: value });
    if (!categoryExists) {
      throw new Error('Categoria inválida.');
    }
    return true;
  }),

  body('price')
  .custom((value, { req }) => {
    const prices = req.body.price;
    if (!Array.isArray(prices)) {
      throw new Error('Erro ao processar os preços.');
    }
    const filledPrices = prices.filter(p => p !== '');
    for (let p of filledPrices) {
      if (isNaN(p) || Number(p) <= 0) {
        throw new Error('Todos os preços preenchidos devem ser números válidos e maiores que zero.');
      }
    }
    return true;
  }),
];

module.exports = dishValidator;