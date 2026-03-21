/**
 * src/validators/payment.validator.js
 * Payment Request Validation
 */

const { body, query, param } = require('express-validator');

const createPayment = [
    body('orderId')
        .isUUID()
        .withMessage('A valid Order ID is required'),
    body('paymentMethod')
        .isIn(['CASH', 'JAZZCASH', 'EASYPAISA'])
        .withMessage('Valid payment method is required (CASH, JAZZCASH, EASYPAISA)'),
];

const confirmPayment = [
    param('id').isUUID().withMessage('Invalid Payment ID'),
    body('amountReceived')
        .isDecimal()
        .withMessage('Amount received must be a decimal value'),
    body('verificationCode')
        .isString()
        .isLength({ min: 6, max: 6 })
        .withMessage('A 6-digit verification code is required'),
];

const getHistory = [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('paymentMethod').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
];

const getRiderCollections = [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('status').optional().isIn(['pending', 'deposited', 'verified']),
];

const riderDeposit = [
    body('amount')
        .isDecimal()
        .withMessage('Valid deposit amount is required'),
    body('depositProof')
        .notEmpty()
        .withMessage('Deposit proof is required (Cloudinary URL)'),
    body('notes')
        .optional()
        .isString(),
];

module.exports = {
    createPayment,
    confirmPayment,
    getHistory,
    getRiderCollections,
    riderDeposit,
};
