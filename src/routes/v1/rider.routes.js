// =============================================================
// src/routes/v1/rider.routes.js — Rider Routes Definition
// =============================================================

const express = require('express');
const riderController = require('../../controllers/rider.controller');
const riderValidator = require('../../validators/rider.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize.middleware');

const { upload } = require('../../middlewares/upload.middleware');

const router = express.Router();

/**
 * Public Routes
 */
router.post('/auth/register', validate(riderValidator.registerRider), riderController.register);

/**
 * Authenticated Rider Routes (Require DELIVERY_PERSON role)
 */
router.use(authenticate, authorize('DELIVERY_PERSON'));

router
    .route('/profile')
    .get(riderController.getProfile)
    .put(validate(riderValidator.updateProfile), riderController.updateProfile);

router.post(
    '/documents/upload',
    upload.single('file'),
    validate(riderValidator.uploadDocument),
    riderController.uploadDocument,
);

router.get('/documents', riderController.getDocuments);
router.get('/verification-status', riderController.getVerificationStatus);

router.put('/availability', validate(riderValidator.updateAvailability), riderController.updateAvailability);
router.put('/online-status', validate(riderValidator.updateOnlineStatus), riderController.updateOnlineStatus);

router.get('/stats', riderController.getStats);
router.get('/ratings', riderController.getRatings);

router.post('/vehicle', validate(riderValidator.updateVehicle), riderController.updateVehicle);
router.put('/bank-details', validate(riderValidator.updateBankDetails), riderController.updateBankDetails);

module.exports = router;
