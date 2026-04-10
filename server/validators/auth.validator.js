const { body } = require('express-validator');

const passwordComplexity = (field = 'password') =>
    body(field)
        .isString().withMessage(`${field} is required`)
        .bail()
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .bail()
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .bail()
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .bail()
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .bail()
        .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character');

exports.registerRules = [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    passwordComplexity('password'),
];

exports.loginRules = [
    body('email').isString().trim().notEmpty().withMessage('email and password are required'),
    body('password').isString().notEmpty().withMessage('email and password are required'),
];

exports.updateProfileRules = [
    body().custom((val) => {
        if (!val || (val.name === undefined && val.email === undefined)) {
            throw new Error('At least one of name or email is required');
        }
        return true;
    }),
    body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('A valid email is required').normalizeEmail(),
];

exports.changePasswordRules = [
    body('old_password').isString().notEmpty().withMessage('Old password and new password are required'),
    body('new_password').isString().notEmpty().withMessage('Old password and new password are required'),
    passwordComplexity('new_password'),
];

exports.forgotPasswordRules = [
    body('email').isString().trim().notEmpty().withMessage('Email is required'),
];

exports.resetPasswordRules = [
    passwordComplexity('password'),
];
