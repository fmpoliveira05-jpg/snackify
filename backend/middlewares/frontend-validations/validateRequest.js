const { validationResult } = require('express-validator');
const { discardUpload } = require('../uploadMiddleware');

/** Campos que nunca são devolvidos ao browser (nem nos erros nem no formulário reposto). */
const SECRET_FIELDS = ['password', 'confirmarPassword', 'confirmPassword'];

/** Só a mensagem e o campo de cada erro: o valor enviado (ex.: a password) não volta na resposta. */
const publicErrors = (errors) => errors.array().map(({ msg, path }) => ({ msg, path }));

const withoutSecrets = (body = {}) => {
  const copy = { ...body };
  SECRET_FIELDS.forEach((field) => delete copy[field]);
  return copy;
};

const validateRequest = (viewToRender, fetchExtrasFn) => {
  return async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Um pedido recusado não deixa a imagem enviada esquecida no disco.
      await discardUpload(req);
      // Pedidos vindos do cliente Angular (ou rotas sem página EJS) recebem os erros em JSON.
      const wantsJson = !viewToRender || req.accepts(['html', 'json']) === 'json' || req.xhr;
      if (wantsJson) {
        return res.status(400).json({ message: 'Dados inválidos.', errors: publicErrors(errors) });
      }

      const extras = fetchExtrasFn ? await fetchExtrasFn(req) : {};

      return res.status(400).render(viewToRender, {
        errors: publicErrors(errors),
        oldInput: withoutSecrets(req.body),
        ...extras
      });
    }

    next();
  };
};

module.exports = validateRequest;