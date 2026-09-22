module.exports = {
  titleValidator: {
    validator: (value) =>
      typeof value === 'string' && value.trim().length > 0 && value.length <= 100,
    message: 'O nome do menu é obrigatório e deve ter no máximo 100 caracteres.'
  },

  descriptionValidator: {
    validator: (value) =>
      value === undefined || (typeof value === 'string' && value.length <= 500),
    message: 'A descrição do menu deve ter no máximo 500 caracteres.'
  }
};