// =============================================================
// src/validators/rider.validator.js — Rider Validation Schemas
// =============================================================

const { body } = require('express-validator');

const registerRider = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required if provided'),
    body('cnicNumber').matches(/^[0-9]{5}-?[0-9]{7}-?[0-9]{1}$|^[0-9]{13}$/).withMessage('Valid CNIC number is required (13 digits)'),
    body('vehicleType').isIn(['BIKE', 'CYCLE', 'CAR', 'SCOOTER', 'MOTORCYCLE', 'VAN']).withMessage('Invalid vehicle type'),
    body('vehicleNumber').notEmpty().withMessage('Vehicle number is required'),
    body('licenseNumber').notEmpty().withMessage('License number is required'),
    body('licenseExpiry').optional().isISO8601().withMessage('Valid license expiry date is required if provided'),
];

const updateProfile = [
    body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
    body('vehicleType').optional().isIn(['BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN']).withMessage('Invalid vehicle type'),
    body('vehicleNumber').optional().notEmpty().withMessage('Vehicle number cannot be empty'),
    body('bankAccountName').optional().notEmpty().withMessage('Bank account name cannot be empty'),
    body('bankAccountNumber').optional().notEmpty().withMessage('Bank account number cannot be empty'),
    body('bankName').optional().notEmpty().withMessage('Bank name cannot be empty'),
];

const uploadDocument = [
    body('documentType')
        .notEmpty().withMessage('Document type is required')
        .isIn(['CNIC_FRONT', 'CNIC_BACK', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION', 'UTILITY_BILL']).withMessage('Invalid document type'),
];

const updateAvailability = [
    body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
];

const updateOnlineStatus = [
    body('isOnline').isBoolean().withMessage('isOnline must be a boolean'),
];

const updateVehicle = [
    body('vehicleType').isIn(['BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN']).withMessage('Invalid vehicle type'),
    body('vehicleNumber').notEmpty().withMessage('Vehicle number is required'),
    body('vehicleMake').notEmpty().withMessage('Vehicle make is required'),
    body('vehicleModel').notEmpty().withMessage('Vehicle model is required'),
    body('vehicleColor').notEmpty().withMessage('Vehicle color is required'),
];

const updateBankDetails = [
    body('bankAccountName').notEmpty().withMessage('Bank account name is required'),
    body('bankAccountNumber').isLength({ min: 10 }).withMessage('Bank account number must be at least 10 digits'),
    body('bankName').notEmpty().withMessage('Bank name is required'),
];

module.exports = {
    registerRider,
    updateProfile,
    uploadDocument,
    updateAvailability,
    updateOnlineStatus,
    updateVehicle,
    updateBankDetails,
};
