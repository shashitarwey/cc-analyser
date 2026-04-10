const { validationResult } = require('express-validator');

// Runs after express-validator chains; returns 400 with the first error message
// to preserve the existing { error: "..." } response shape used across the API.
module.exports = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    const first = errors.array({ onlyFirstError: true })[0];
    return res.status(400).json({ error: first.msg });
};
