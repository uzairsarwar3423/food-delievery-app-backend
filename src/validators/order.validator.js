/**
 * src/validators/order.validator.js
 * Order Request Validation
 */

const { body, query, param } = require('express-validator');

const createOrder = [
    body('deliveryAddressId')
        .isUUID()
        .withMessage('A valid delivery address is required'),

    body('paymentMethod')
        .isIn(['CASH', 'JAZZCASH', 'EASYPAISA', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET', 'UPI'])
        .withMessage('Please select a valid payment method'),

    body('specialInstructions')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Special instructions cannot exceed 500 characters'),

    body('couponCode')
        .optional()
        .isString()
        .withMessage('Coupon code must be a string'),
];

const updateStatus = [
    param('id').isUUID().withMessage('Invalid Order ID'),
    body('status')
        .isIn(['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'])
        .withMessage('Invalid order status provided'),
];

const cancelOrder = [
    param('id').isUUID().withMessage('Invalid Order ID'),
    body('reason')
        .notEmpty()
        .withMessage('Cancellation reason is required')
        .isLength({ max: 255 })
        .withMessage('Reason is too long'),
];

const reviewOrder = [
    param('id').isUUID().withMessage('Invalid Order ID'),
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Overall rating must be between 1 and 5'),
    body('foodRating')
        .optional()
        .isInt({ min: 1, max: 5 }),
    body('serviceRating')
        .optional()
        .isInt({ min: 1, max: 5 }),
    body('deliveryRating')
        .optional()
        .isInt({ min: 1, max: 5 }),
    body('comment')
        .optional()
        .isString()
        .isLength({ max: 1000 }),
];

const getHistory = [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
];

module.exports = {
    createOrder,
    updateStatus,
    cancelOrder,
    reviewOrder,
    getHistory,
};
