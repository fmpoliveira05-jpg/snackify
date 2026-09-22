const { validationResult } = require('express-validator');

const validateRequest = (viewToRender, fetchExtrasFn) => {
  return async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
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