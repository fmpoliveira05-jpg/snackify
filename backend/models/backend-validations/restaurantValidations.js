const nifIsValid = require('../../utils/nifValidator');

module.exports = {
  nameValidator: {
    validator: (value) =>
      typeof value === 'string' && value.trim().length <= 50,
    message: 'O nome deve ter no máximo 50 caracteres.'
  },

  usernameValidator: {
    validator: (value) =>
      /^\S{1,20}$/.test(value),
    message: 'O username não pode conter espaços e deve ter no máximo 20 caracteres.'
  },

  emailValidator: {
    validator: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'O email é inválido.'
  },

  passwordValidator: {
    validator: (value) =>
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,20}$/.test(value),
    message: 'A password deve ter entre 8 e 20 caracteres e conter uma letra maiúscula, uma minúscula, um número e um caractere especial.'
  },

  foundedAtValidator: {
    validator: (value) => {
      if (!value) return false;
      const inputDate = new Date(value);
      const today = new Date();
      return (
        inputDate <= today &&
        inputDate >= new Date('1800-01-01')
      );
    },
    message: 'A data de fundação deve ser entre 1800 e hoje.'
  },

  streetValidator: {
    validator: (value) =>
      /^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/.test(value),
    message: 'A rua deve começar com uma letra maiúscula.'
  },

  numberValidator: {
    validator: (value) =>
      /^[0-9]{1,5}([A-Za-z]|[-/][0-9A-Za-z]{1,3})?$/.test(value),
    message: 'O número da porta tem um formato inválido.'
  },

  floorValidator: {
    validator: (value) =>
      !value || /^((R\/C)|(RC)|-?[0-9]{1,2}(º)?([A-Za-z]{1,4})?)$/.test(value),
    message: 'O formato do andar é inválido.'
  },

  zipCodeValidator: {
    validator: (value) =>
      /^\d{4}-\d{3}$/.test(value),
    message: 'O formato do código postal é inválido. Exemplo válido: 1234-567'
  },

  placeValidator: {
    validator: (value) =>
      /^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/.test(value),
    message: 'A cidade deve começar com uma letra maiúscula.'
  },

  districtValidator: {
    validator: (value) =>
      /^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/.test(value),
    message: 'O distrito deve começar com uma letra maiúscula.'
  },

  countryValidator: {
    validator: (value) =>
      /^[A-ZÁÂÃÉÊÍÓÔÕÚÇ].*/.test(value),
    message: 'O país deve começar com uma letra maiúscula.'
  },

  phoneValidator: {
    validator: (value) =>
      /^\d{9}$/.test(value),
    message: 'O número de telefone deve ter exatamente 9 dígitos numéricos.'
  },

  nifValidator: {
    validator: (value) =>
      /^\d{9}$/.test(value) && nifIsValid(value),
    message: 'O NIF deve ter 9 dígitos numéricos válidos.'
  }
};