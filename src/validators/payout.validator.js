// =============================================================
// src/validators/payout.validator.js — Payout Validation Schemas
// =============================================================

const { body, query } = require('express-validator');

/**
 * Validate payout request amount
 */
const requestPayout = [
    body('amount')
        .isFloat({ min: 1000 })
        .withMessage('Minimum payout amount is PKR 1,000'),
];

/**
 * Validate trip history filters
 */
const tripHistoryFilters = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('dateFrom').optional().isISO8601().withMessage('Invalid dateFrom format (ISO8601)'),
    query('dateTo').optional().isISO8601().withMessage('Invalid dateTo format (ISO8601)'),
];

/**
 * Validate earnings breakdown period
 */
const breakdownPeriod = [
    query('period')
        .optional()
        .isIn(['week', 'month', 'year'])
        .withMessage('Period must be one of: week, month, year'),
];

/**
 * Validate payout history filters
 */
const payoutHistoryFilters = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

module.exports = {
    requestPayout,
    tripHistoryFilters,
    breakdownPeriod,
    payoutHistoryFilters,
};
