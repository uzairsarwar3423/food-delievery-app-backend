// =============================================================
// src/validators/delivery.validator.js — Delivery Validation (Express-Validator)
// =============================================================

const { body, query, param } = require('express-validator');

const getAvailableDeliveries = [
    query('latitude').isFloat().withMessage('Latitude must be a valid number'),
    query('longitude').isFloat().withMessage('Longitude must be a valid number'),
];

const acceptDelivery = [
    param('id').isUUID().withMessage('Invalid order ID'),
];

const pickupDelivery = [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('verificationCode').notEmpty().withMessage('Verification code is required'),
];

const updateLocation = [
    body('latitude').isFloat().withMessage('Latitude must be a valid number'),
    body('longitude').isFloat().withMessage('Longitude must be a valid number'),
    body('accuracy').optional().isFloat().withMessage('Accuracy must be a number'),
    body('speed').optional().isFloat().withMessage('Speed must be a number'),
    body('heading').optional().isFloat().withMessage('Heading must be a number'),
];

const completeDelivery = [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('verificationCode').notEmpty().withMessage('Verification code is required'),
    body('proofOfDelivery').optional().isString().withMessage('Proof of delivery must be a string (URL)'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('cashCollected').optional().isFloat().withMessage('Cash collected must be a number'),
];

const reportIssue = [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('issueType').notEmpty().withMessage('Issue type is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('images').optional().isArray().withMessage('Images must be an array'),
];

module.exports = {
    getAvailableDeliveries,
    acceptDelivery,
    pickupDelivery,
    updateLocation,
    completeDelivery,
    reportIssue,
};
