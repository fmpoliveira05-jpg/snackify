module.exports = {
  nameValidator: {
    validator: (value) =>
      typeof value === 'string' && value.trim().length > 0 && value.length <= 100,
    message: 'O nome do prato é obrigatório e deve ter no máximo 100 caracteres.'
  },

  descriptionValidator: {
    validator: (value) =>
      value === undefined || (typeof value === 'string' && value.length <= 500),
    message: 'A descrição do prato deve ter no máximo 500 caracteres.'
  },

  pricePerDoseValidator: {
    validator: (priceArray) => {
      if (!Array.isArray(priceArray)) return false;
      for (let item of priceArray) {
        if (
          !item.dose ||
          !['1/2', '1'].includes(item.dose) ||
          typeof item.price !== 'number' ||
          item.price <= 0
        ) {
          return false;
        }
      }
      return true;
    },
    message: 'Cada preço deve conter uma dose válida (1/2 dose ou 1 dose) e um valor numérico maior do que zero.'
  }
};