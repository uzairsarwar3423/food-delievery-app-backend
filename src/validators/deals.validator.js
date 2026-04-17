/**
 * src/validators/deals.validator.js
 * Validation rules for deals endpoints
 */

const { query, body, param } = require('express-validator');

const getDealsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('featured').optional().toBoolean(),
  query('restaurantId').optional().isUUID().withMessage('Invalid restaurant ID'),
  query('sortBy').optional().isIn(['newest', 'ending_soon', 'popular']).withMessage('Invalid sortBy value'),
];

const applyDealValidator = [
  param('id').isUUID().withMessage('Invalid deal ID'),
  body('cartData').notEmpty().withMessage('Cart data is required'),
  body('cartData.subtotal').notEmpty().isNumeric().withMessage('Cart subtotal must be a number'),
  body('cartData.restaurantId').notEmpty().isUUID().withMessage('Cart restaurant ID must be a valid UUID'),
];

const dealIdValidator = [
  param('id').isUUID().withMessage('Invalid deal ID'),
];

module.exports = {
  getDealsValidator,
  applyDealValidator,
  dealIdValidator,
};
