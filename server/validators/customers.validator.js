const { body, param } = require('express-validator');

exports.createRules = [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('phone').optional().isString().trim(),
    body('notes').optional().isString().trim(),
];

exports.updateRules = [
    param('id').isMongoId().withMessage('Invalid customer id'),
    body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().isString().trim(),
    body('notes').optional().isString().trim(),
];

exports.idRule = [param('id').isMongoId().withMessage('Invalid customer id')];
exports.customerIdRule = [param('customerId').isMongoId().withMessage('Invalid customer id')];

exports.entryCreateRules = [
    body('customer_id').isMongoId().withMessage('customer_id is required'),
    body('type').isIn(['gave', 'got']).withMessage('type must be "gave" or "got"'),
    body('amount').exists().withMessage('amount is required')
        .bail()
        .isFloat({ gt: 0 }).withMessage('amount must be positive'),
    body('entry_date').isISO8601().withMessage('entry_date must be a valid date'),
    body('notes').optional().isString().isLength({ max: 200 }).withMessage('Remark must be 200 characters or less'),
];

exports.entryUpdateRules = [
    param('id').isMongoId().withMessage('Invalid entry id'),
    body('type').optional().isIn(['gave', 'got']).withMessage('type must be "gave" or "got"'),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be positive'),
    body('entry_date').optional().isISO8601().withMessage('entry_date must be a valid date'),
    body('notes').optional().isString().isLength({ max: 200 }).withMessage('Remark must be 200 characters or less'),
];

exports.entryIdRule = [param('id').isMongoId().withMessage('Invalid entry id')];
