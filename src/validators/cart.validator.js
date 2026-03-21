/**
 * src/validators/cart.validator.js
 * Cart Validation Schemas
 */

const { body, param } = require('express-validator');

const addItem = [
    body('menuItemId').isUUID().withMessage('Invalid menu item ID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('customizations').optional().isObject().withMessage('Customizations must be an object'),
    body('clearIfDifferentRestaurant').optional().isBoolean().withMessage('clearIfDifferentRestaurant must be a boolean'),
];

const updateItem = [
    param('itemId').isUUID().withMessage('Invalid item ID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

const removeItem = [
    param('itemId').isUUID().withMessage('Invalid item ID'),
];

const applyCoupon = [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
];

module.exports = {
    addItem,
    updateItem,
    removeItem,
    applyCoupon,
};
