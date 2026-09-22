const nifIsValid = require('../../utils/nifValidator');

module.exports = {
  nameValidator: {
    validator: (value) =>
      /^[A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+(?: [A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+)+$/.test(value),
    message: 'O nome deve conter pelo menos dois nomes próprios com iniciais maiúsculas, e não pode conter números.'
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

  birthDateValidator: {
    validator: (value) => {
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      const isBeforeBirthday = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0);
      const realAge = isBeforeBirthday ? age - 1 : age;

      return birthDate <= today && realAge >= 18 && realAge <= 120;
    },
    message: 'A data de nascimento deve indicar uma idade entre 18 e 120 anos e não pode ser no futuro.'
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
    message: 'A localidade deve começar com uma letra maiúscula.'
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
    message: 'O número de telemóvel deve ter exatamente 9 dígitos numéricos.'
  },

  nifValidator: {
    validator: (value) => {
      if (!value) return true;
      return /^\d{9}$/.test(value) && nifIsValid(value);
    },
    message: 'O NIF deve ter 9 dígitos numéricos válidos.'
  }
};