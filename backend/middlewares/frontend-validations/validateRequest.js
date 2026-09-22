const { validationResult } = require('express-validator');

const validateRequest = (viewToRender, fetchExtrasFn) => {
  return async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Pedidos vindos do cliente Angular (ou rotas sem página EJS) recebem os erros em JSON.
      const wantsJson = !viewToRender || req.accepts(['html', 'json']) === 'json' || req.xhr;
      if (wantsJson) {
        return res.status(400).json({ message: 'Dados inválidos.', errors: errors.array() });
      }

      const extras = fetchExtrasFn ? await fetchExtrasFn(req) : {};

      return res.status(400).render(viewToRender, {
        errors: errors.array(),
        oldInput: req.body,
        ...extras
      });
    }

    next();
  };
};

module.exports = validateRequest;