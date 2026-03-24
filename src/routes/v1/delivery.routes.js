// =============================================================
// src/routes/v1/delivery.routes.js — Delivery Routes
// =============================================================

const express = require('express');
const router = express.Router();
const deliveryController = require('../../controllers/delivery.controller');
const deliveryValidator = require('../../validators/delivery.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const { upload } = require('../../middlewares/upload.middleware');
const { ROLES } = require('../../utils/constants');

// All delivery routes are for riders (Delivery Persons)
router.use(authenticate, authorize(ROLES.DELIVERY_PERSON));

// Available deliveries (Distance based)
router.get('/deliveries/available', validate(deliveryValidator.getAvailableDeliveries), deliveryController.getAvailableDeliveries);

// Active delivery management
router.post('/deliveries/:id/accept', validate(deliveryValidator.acceptDelivery), deliveryController.acceptDelivery);
router.put('/deliveries/:id/decline', deliveryController.declineDelivery); // No body
router.put('/deliveries/:id/arrive-restaurant', deliveryController.arriveAtRestaurant);
router.put('/deliveries/:id/pickup', validate(deliveryValidator.pickupDelivery), deliveryController.pickupDelivery);
router.put('/deliveries/:id/arrive-customer', deliveryController.arriveAtCustomer);

// Complete delivery (with proof)
router.put('/deliveries/:id/complete',
    upload.single('proofOfDelivery'),
    validate(deliveryValidator.completeDelivery),
    deliveryController.completeDelivery
);

// History
router.get('/deliveries/history', deliveryController.getHistory);

// Issue reporting
router.post('/deliveries/:id/issue', validate(deliveryValidator.reportIssue), deliveryController.reportIssue);

// Location updates (No deliveries prefix here according to prompt)
router.post('/location/update', validate(deliveryValidator.updateLocation), deliveryController.updateLocation);

module.exports = router;
