/**
 * src/validators/restaurant.validator.js
 * Restaurant Validation Schemas
 */

const { body, query } = require('express-validator');

const createRestaurant = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim(),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('addressLine1').trim().notEmpty().withMessage('Address Line 1 is required'),
  body('addressLine2').optional().trim(),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('cuisineTypes')
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        // Handle JSON stringified array
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            return JSON.parse(value);
          } catch (e) {
            return [value];
          }
        }
        // Handle single string (standard multipart/form-data with 1 item)
        return [value];
      }
      return value;
    })
    .isArray()
    .withMessage('Cuisine types must be an array'),
  body('estimatedDeliveryMin').optional().isInt({ min: 1 }).withMessage('Valid delivery minimum time is required'),
  body('estimatedDeliveryMax').optional().isInt({ min: 1 }).withMessage('Valid delivery maximum time is required'),
  body('minimumOrderAmount').optional().isFloat({ min: 0 }).withMessage('Valid minimum order amount is required'),
  body('deliveryFee').optional().isFloat({ min: 0 }).withMessage('Valid delivery fee is required'),
  body('priceRange').optional().isInt({ min: 1, max: 4 }).withMessage('Price range must be between 1 and 4'),
  body('businessHours').optional().isObject().withMessage('Business hours must be an object'),
  body('holidays').optional().isArray().withMessage('Holidays must be an array'),
  body('taxSettings').optional().isObject().withMessage('Tax settings must be an object'),
  body('paymentMethods').optional().isArray().withMessage('Payment methods must be an array'),
];

const updateRestaurant = [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('email').optional().isEmail(),
  body('phone').optional().trim().notEmpty(),
  body('addressLine1').optional().trim().notEmpty(),
  body('city').optional().trim().notEmpty(),
  body('state').optional().trim().notEmpty(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('cuisineTypes').optional().isArray(),
  body('estimatedDeliveryMin').optional().isInt({ min: 1 }),
  body('estimatedDeliveryMax').optional().isInt({ min: 1 }),
  body('minimumOrderAmount').optional().isFloat({ min: 0 }),
  body('deliveryFee').optional().isFloat({ min: 0 }),
  body('priceRange').optional().isInt({ min: 1, max: 4 }),
  body('businessHours').optional().isObject(),
  body('holidays').optional().isArray(),
  body('taxSettings').optional().isObject(),
  body('paymentMethods').optional().isArray(),
];

const searchRestaurants = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  query('category').optional().isUUID().withMessage('Invalid category ID'),
  query('ownerId').optional().isUUID().withMessage('Invalid owner ID'),
  query('status').optional().isIn(['PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'CLOSED']),
  query('cuisines').optional(),
  query('rating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
  query('latitude').optional().isFloat({ min: -90, max: 90 }).toFloat(),
  query('longitude').optional().isFloat({ min: -180, max: 180 }).toFloat(),
  query('radius').optional().isFloat({ min: 0.1 }).toFloat(),
  query('sortBy').optional().isIn(['rating', 'distance', 'deliveryTime', 'popularity', 'relevance']),
  query('isOpen').optional().toBoolean(),
  query('priceRange').optional().isInt({ min: 1, max: 4 }).toInt(),
];

const updateStatus = [
  body('isOpen').isBoolean().withMessage('isOpen must be a boolean'),
];

module.exports = {
  createRestaurant,
  updateRestaurant,
  searchRestaurants,
  updateStatus,
};
