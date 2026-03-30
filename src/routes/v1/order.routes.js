/**
 * src/routes/v1/order.routes.js
 * Order Routes
 */

const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order.controller');
const orderValidator = require('../../validators/order.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const restaurantAuth = require('../../middlewares/restaurantAuth.middleware');
const analyticsController = require('../../controllers/analytics.controller');
const { ROLES } = require('../../utils/constants');

// All order routes are authenticated
router.use(authenticate);

/** 
 * GET /api/v1/orders/active
 * Must be defined before :id routes
 */
router.get('/active', orderController.getActiveOrders);

/** 
 * GET /api/v1/orders/stats
 * Summary stats for dashboard (scoping depends on role)
 */
router.get('/stats', (req, res, next) => {
    if (req.user.role === ROLES.RESTAURANT_OWNER) {
        return restaurantAuth(req, res, () => analyticsController.getDashboardStats(req, res, next));
    }
    return orderController.getStats(req, res, next);
});

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
 * POST /api/v1/orders/:id/reorder
 */
router.post('/:id/reorder', orderController.reorder);

module.exports = router;
