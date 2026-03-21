/**
 * src/validators/category.validator.js
 * Category Validation Schemas
 */

const { body, param } = require('express-validator');

const createCategory = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim(),
  body('displayOrder').optional().isInt({ min: 0 }).toInt(),
];

const updateCategory = [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('displayOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean(),
];

const reorderCategories = [
  body('categories').isArray().withMessage('Categories must be an array'),
  body('categories.*.id').isUUID().withMessage('Invalid ID'),
  body('categories.*.displayOrder').isInt({ min: 0 }).toInt(),
];

module.exports = {
  createCategory,
  updateCategory,
  reorderCategories,
};
