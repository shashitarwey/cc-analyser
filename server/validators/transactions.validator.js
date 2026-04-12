const { body, param } = require('express-validator');

exports.createRules = [
    body('card_id').isMongoId().withMessage('card_id is required'),
    body('amount').exists().withMessage('Amount is required')
        .bail()
        .isFloat({ gt: 0 }).withMessage('Amount must be positive'),
    body('description').optional().isString().trim(),
    body('date').optional({ values: 'falsy' }).isISO8601().withMessage('date must be a valid ISO8601 date'),
];

exports.idRule = [param('id').isMongoId().withMessage('Invalid transaction id')];
