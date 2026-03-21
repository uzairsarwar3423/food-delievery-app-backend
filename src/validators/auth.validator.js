// =============================================================
// src/validators/auth.validator.js — Authentication Validation
// =============================================================

const { body } = require('express-validator');
const { PASSWORD } = require('../utils/constants');

const registerValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format (E.164)'),

  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: PASSWORD.MIN_LENGTH }).withMessage(`Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
    .matches(PASSWORD.REGEX).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 100 }).withMessage('First name is too long'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 100 }).withMessage('Last name is too long'),

  body('role')
    .optional()
    .isIn(['CUSTOMER', 'RESTAURANT_OWNER', 'DELIVERY_PERSON'])
    .withMessage('Invalid user role'),
];

const loginValidator = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email or phone is required'),

  body('password')
    .trim()
    .notEmpty().withMessage('Password is required'),
];

const verifyEmailValidator = [
  body('token')
    .trim()
    .notEmpty().withMessage('Verification token is required'),
];

const resendVerificationValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

const resetPasswordValidator = [
  body('password')
    .trim()
    .notEmpty().withMessage('New password is required')
    .isLength({ min: PASSWORD.MIN_LENGTH }).withMessage(`Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
    .matches(PASSWORD.REGEX).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('confirmPassword')
    .trim()
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const changePasswordValidator = [
  body('currentPassword')
    .trim()
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .trim()
    .notEmpty().withMessage('New password is required')
    .isLength({ min: PASSWORD.MIN_LENGTH }).withMessage(`Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
    .matches(PASSWORD.REGEX).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password cannot be the same as current password');
      }
      return true;
    }),

  body('confirmPassword')
    .trim()
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

module.exports = {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
};
