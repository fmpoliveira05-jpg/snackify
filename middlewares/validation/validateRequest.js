const { validationResult } = require('express-validator');

const validateRequest = (viewToRender) => {
    return (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).render(viewToRender, {
                errors: errors.array(),
                oldInput: req.body
            });
        }

        next();
    };
};

module.exports = validateRequest;