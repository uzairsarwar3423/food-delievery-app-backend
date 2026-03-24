const { query, body } = require('express-validator');

const searchRestaurants = [
    query('q').optional().trim(),
    query('filters').optional().isJSON().withMessage('Filters must be a valid JSON string'),
    query('sort').optional().isIn(['relevance', 'rating', 'newest', 'delivery_fee']).withMessage('Invalid sort criteria'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const searchMenuItems = [
    query('q').optional().trim(),
    query('restaurantId').optional().isUUID().withMessage('Invalid restaurant ID'),
    query('filters').optional().isJSON().withMessage('Filters must be a valid JSON string'),
];

const getSuggestions = [
    query('q')
        .notEmpty().withMessage('Search term is required')
        .isLength({ min: 2 }).withMessage('Search term must be at least 2 characters'),
];

const saveSearch = [
    body('searchTerm')
        .notEmpty().withMessage('Search term is required')
        .isString().withMessage('Search term must be a string')
        .isLength({ max: 255 }).withMessage('Search term is too long'),
];

module.exports = {
    searchRestaurants,
    searchMenuItems,
    getSuggestions,
    saveSearch,
};
