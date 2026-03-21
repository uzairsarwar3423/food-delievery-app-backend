// =============================================================
// src/validators/user.validator.js — User Management Validation
// =============================================================

const { body, param } = require('express-validator');

const updateProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format (E.164)'),
];

const addressValidator = [
  body('label')
    .trim()
    .notEmpty().withMessage('Label is required (e.g., Home, Work)')
    .isLength({ max: 50 }).withMessage('Label is too long'),

  body('fullAddress')
    .trim()
    .notEmpty().withMessage('Full address is required')
    .isLength({ max: 255 }).withMessage('Address is too long'),

  body('addressLine2')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Address line 2 is too long'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City name is too long'),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required')
    .isLength({ max: 100 }).withMessage('State name is too long'),

  body('postalCode')
    .trim()
    .notEmpty().withMessage('Postal code is required')
    .isLength({ max: 20 }).withMessage('Postal code is too long'),

  body('latitude')
    .optional()
    .isDecimal().withMessage('Invalid latitude'),

  body('longitude')
    .optional()
    .isDecimal().withMessage('Invalid longitude'),

  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault must be a boolean'),

  body('deliveryInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Instructions are too long'),
];

const updateAddressValidator = [
  body('label')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Label is too long'),

  body('fullAddress')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Address is too long'),

  body('addressLine2')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Address line 2 is too long'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City name is too long'),

  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('State name is too long'),

  body('postalCode')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Postal code is too long'),

  body('latitude')
    .optional()
    .isDecimal().withMessage('Invalid latitude'),

  body('longitude')
    .optional()
    .isDecimal().withMessage('Invalid longitude'),

  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault must be a boolean'),

  body('deliveryInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Instructions are too long'),
];

const favoriteValidator = [
  param('restaurantId')
    .isUUID().withMessage('Invalid restaurant ID format'),
];

module.exports = {
  updateProfileValidator,
  addressValidator,
  updateAddressValidator,
  favoriteValidator,
};
