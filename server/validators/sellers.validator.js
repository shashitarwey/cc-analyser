const { body, param } = require('express-validator');

exports.createRules = [
    body('name').isString().trim().notEmpty().withMessage('Name and city are required'),
    body('city').isString().trim().notEmpty().withMessage('Name and city are required'),
    body('phone').optional().isString().trim(),
];

exports.updateRules = [
    param('id').isMongoId().withMessage('Invalid seller id'),
    body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty'),
    body('city').optional().isString().trim().notEmpty().withMessage('City cannot be empty'),
    body('phone').optional().isString().trim(),
];

exports.idRule = [param('id').isMongoId().withMessage('Invalid seller id')];
exports.sellerIdRule = [param('sellerId').isMongoId().withMessage('Invalid seller id')];

exports.paymentCreateRules = [
    body('seller_id').isMongoId().withMessage('seller_id is required'),
    body('amount').exists().withMessage('amount is required')
        .bail()
        .isFloat({ gt: 0 }).withMessage('amount must be positive'),
    body('payment_date').isISO8601().withMessage('payment_date must be a valid date'),
    body('notes').optional().isString(),
];

exports.paymentUpdateRules = [
    param('id').isMongoId().withMessage('Invalid payment id'),
    body('amount').optional({ values: 'falsy' }).isFloat({ gt: 0 }).withMessage('amount must be positive'),
    body('payment_date').optional({ values: 'falsy' }).isISO8601().withMessage('payment_date must be a valid date'),
    body('notes').optional().isString(),
];

exports.paymentIdRule = [param('id').isMongoId().withMessage('Invalid payment id')];
