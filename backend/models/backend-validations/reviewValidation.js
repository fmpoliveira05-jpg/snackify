module.exports = {
  titleValidator: {
    validator: (value) =>
      typeof value === 'string' && value.trim().length > 0 && value.length <= 100,
    message: 'O título é obrigatório e deve ter no máximo 100 caracteres.'
  },

  descriptionValidator: {
    validator: (value) =>
      typeof value === 'string' && value.trim().length > 0 && value.length <= 1000,
    message: 'A descrição é obrigatória e deve ter no máximo 1000 caracteres.'
  },

  imageValidator: {
    validator: (value) =>
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.length <= 255),
    message: 'O nome do ficheiro da imagem deve ter no máximo 255 caracteres.'
  }
};
