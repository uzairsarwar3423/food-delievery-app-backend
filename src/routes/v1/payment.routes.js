/**
 * src/routes/v1/payment.routes.js
 * Payment Routes
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payment.controller');
const paymentValidator = require('../../validators/payment.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../utils/constants');

// All payment routes are authenticated
router.use(authenticate);

/**
 * GET /api/v1/payments/methods/available
 */
router.get('/methods/available', paymentController.getAvailableMethods);

/**
 * GET /api/v1/payments/history
 */
router.get('/history',
    validate(paymentValidator.getHistory),
    paymentController.getPaymentHistory
);

/**
 * GET /api/v1/payments/rider/collections
 * Rider only
 */
router.get('/rider/collections',
    authorize(ROLES.DELIVERY_PERSON, ROLES.ADMIN),
    validate(paymentValidator.getRiderCollections),
    paymentController.getRiderCollections
);

/**
 * POST /api/v1/payments/rider/deposit
 * Rider only
 */
router.post('/rider/deposit',
    authorize(ROLES.DELIVERY_PERSON),
    validate(paymentValidator.riderDeposit),
    paymentController.riderDeposit
);

/**
 * POST /api/v1/payments/create
 */
router.post('/create',
    validate(paymentValidator.createPayment),
    paymentController.createPayment
);

/**
 * GET /api/v1/payments/:id
 */
router.get('/:id', paymentController.getPayment);

/**
 * GET /api/v1/payments/order/:orderId
 */
router.get('/order/:orderId', paymentController.getPaymentByOrder);

/**
 * POST /api/v1/payments/:id/confirm
 * Rider only
 */
router.post('/:id/confirm',
    authorize(ROLES.DELIVERY_PERSON, ROLES.ADMIN),
    validate(paymentValidator.confirmPayment),
    paymentController.confirmCashPayment
);

module.exports = router;
