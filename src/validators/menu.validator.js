/**
 * src/validators/menu.validator.js
 * Menu Validation Schemas
 */

const { body, param, query } = require('express-validator');

const createMenuItem = [
  param('restaurantId').isUUID().withMessage('Invalid restaurant ID'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('categoryId').isUUID().withMessage('Invalid category ID'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice').optional().isFloat({ min: 0 }).custom((value, { req }) => {
    if (parseFloat(value) >= parseFloat(req.body.price)) {
      throw new Error('Discount price must be less than regular price');
    }
    return true;
  }),
  body('preparationTime').optional().isInt({ min: 1 }).withMessage('Preparation time must be at least 1 minute'),
  body('isAvailable').optional().isBoolean(),
  body('isVegetarian').optional().isBoolean(),
  body('isVegan').optional().isBoolean(),
  body('isGlutenFree').optional().isBoolean(),
  body('spiceLevel').optional().isInt({ min: 0, max: 5 }),
  body('calories').optional().isInt({ min: 0 }),
  body('allergens').optional().custom((value) => {
    if (typeof value === 'string') {return true;}
    if (Array.isArray(value)) {return true;}
    throw new Error('Allergens must be a string or array');
  }),
  body('tags').optional().custom((value) => {
    if (typeof value === 'string') {return true;}
    if (Array.isArray(value)) {return true;}
    throw new Error('Tags must be a string or array');
  }),
];

const updateMenuItem = [
  param('id').isUUID().withMessage('Invalid menu item ID'),
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('price').optional().isFloat({ min: 0 }),
  body('discountPrice').optional().isFloat({ min: 0 }),
  body('categoryId').optional().isUUID(),
  body('isAvailable').optional().isBoolean(),
  body('preparationTime').optional().isInt({ min: 1 }),
];

const updateAvailability = [
  param('id').isUUID().withMessage('Invalid menu item ID'),
  body('isAvailable').isBoolean().withMessage('Availability must be a boolean'),
];

const bulkAvailability = [
  body('menuItemIds').isArray().notEmpty().withMessage('menuItemIds array is required'),
  body('menuItemIds.*').isUUID().withMessage('Invalid menu item ID in array'),
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
];

const updatePrice = [
  param('id').isUUID().withMessage('Invalid menu item ID'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
  body('discountPrice').optional().isFloat({ min: 0 }).custom((value, { req }) => {
    if (parseFloat(value) >= parseFloat(req.body.price)) {
      throw new Error('Discount price must be less than regular price');
    }
    return true;
  }),
];

module.exports = {
  createMenuItem,
  updateMenuItem,
  updateAvailability,
  bulkAvailability,
  updatePrice,
};
