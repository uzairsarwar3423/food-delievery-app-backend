/**
 * src/routes/v1/order.routes.js
 * Order Routes
 */

const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order.controller');
const orderValidator = require('../../validators/order.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');

// All order routes are authenticated
router.use(authenticate);

/** 
 * GET /api/v1/orders/active
 * Must be defined before :id routes
 */
router.get('/active', orderController.getActiveOrders);

/** 
 * GET /api/v1/orders/stats
 */
router.get('/stats', orderController.getStats);

/**
 * GET /api/v1/orders
 * List history
 */
router.get('/',
    validate(orderValidator.getHistory),
    orderController.getOrderHistory
);

/**
 * POST /api/v1/orders
 * Place new order
 */
router.post('/',
    validate(orderValidator.createOrder),
    orderController.createOrder
);

/**
 * GET /api/v1/orders/:id
 * Detail view
 */
router.get('/:id', orderController.getOrderDetails);

/**
 * PUT /api/v1/orders/:id/cancel
 * Cancel order
 */
router.put('/:id/cancel',
    validate(orderValidator.cancelOrder),
    orderController.cancelOrder
);

/**
 * GET /api/v1/orders/:id/track
 * Tracking view
 */
router.get('/:id/track', orderController.trackOrder);

/**
 * PUT /api/v1/orders/:id/status
 * Status update (Admin/Owner/Rider)
 */
router.put('/:id/status',
    validate(orderValidator.updateStatus),
    orderController.updateStatus
);

/**
 * POST /api/v1/orders/:id/review
 * Add review
 */
router.post('/:id/review',
    validate(orderValidator.reviewOrder),
    orderController.addReview
);

/**
 * POST /api/v1/orders/:id/reorder
 */
router.post('/:id/reorder', orderController.reorder);

module.exports = router;
