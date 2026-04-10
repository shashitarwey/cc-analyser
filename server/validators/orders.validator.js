const { body, param } = require('express-validator');

const VARIANTS = ['NA', '6/128', '8/128', '8/256', '12/256', '4/64', '4/128', '12/1024', '12/512'];
const DELIVERY = ['Yes', 'No', 'Cancelled'];

const baseRules = (optional = false) => {
    const opt = (chain) => (optional ? chain.optional() : chain);
    return [
        opt(body('card_id').isMongoId()).withMessage('card_id is required'),
        opt(body('seller_id').isMongoId()).withMessage('seller_id is required'),
        opt(body('order_date').isISO8601()).withMessage('order_date must be a valid date'),
        body('delivered_date').optional({ nullable: true }).isISO8601().withMessage('delivered_date must be a valid date'),
        opt(body('order_amount').isFloat({ min: 0 })).withMessage('order_amount must be >= 0'),
        opt(body('return_amount').isFloat({ min: 0 })).withMessage('return_amount must be >= 0'),
        body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be >= 1'),
        body('cashback').optional().isFloat({ min: 0 }).withMessage('cashback must be >= 0'),
        body('variant').optional().isIn(VARIANTS).withMessage(`variant must be one of ${VARIANTS.join(', ')}`),
        opt(body('model_ordered').isString().trim().notEmpty()).withMessage('model_ordered is required'),
        opt(body('id_used').isString().trim().notEmpty()).withMessage('id_used is required'),
        body('delivery_status').optional().isIn(DELIVERY).withMessage(`delivery_status must be one of ${DELIVERY.join(', ')}`),
        opt(body('ecomm_site').isString().trim().notEmpty()).withMessage('ecomm_site is required'),
        body('is_cleared').optional().isBoolean().withMessage('is_cleared must be boolean'),
        body('remark').optional({ nullable: true }).isString().withMessage('remark must be a string')
            .bail()
            .isLength({ max: 200 }).withMessage('remark must be 200 characters or fewer'),
    ];
};

exports.createRules = baseRules(false);
exports.updateRules = [param('id').isMongoId().withMessage('Invalid order id'), ...baseRules(true)];
exports.idRule = [param('id').isMongoId().withMessage('Invalid order id')];
