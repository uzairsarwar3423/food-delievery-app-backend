/**
 * src/controllers/order.controller.js
 * Order Endpoints Controller
 */

const orderService = require('../services/order.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { PAGINATION } = require('../utils/constants');

/**
 * @desc    Create a new order from cart
 * @route   POST /api/v1/orders
 * @access  Private (Customer)
 */
const createOrder = asyncHandler(async (req, res) => {
    const order = await orderService.createOrder(req.user.id, req.body);
    return ApiResponse.created(res, order, 'Order placed successfully');
});

/**
 * @desc    Get order history for current user
 * @route   GET /api/v1/orders
 * @access  Private (Customer)
 */
const getOrderHistory = asyncHandler(async (req, res) => {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, dateFrom, dateTo } = req.query;
    const { orders, total } = await orderService.getOrderHistory(req.user.id, {
        page,
        limit,
        status,
        dateFrom,
        dateTo,
    });

    return ApiResponse.paginated(res, orders, {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
    }, 'Order history fetched successfully');
});

/**
 * @desc    Get detailed order information
 * @route   GET /api/v1/orders/:id
 * @access  Private (Owner/Customer/Admin/Rider)
 */
const getOrderDetails = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderDetails(req.params.id, req.user);
    return ApiResponse.success(res, order, 'Order details fetched successfully');
});

/**
 * @desc    Cancel an order
 * @route   PUT /api/v1/orders/:id/cancel
 * @access  Private (Customer)
 */
const cancelOrder = asyncHandler(async (req, res) => {
    const order = await orderService.cancelOrder(req.params.id, req.user.id, req.body);
    return ApiResponse.success(res, order, 'Order cancelled successfully');
});

/**
 * @desc    Track a live order
 * @route   GET /api/v1/orders/:id/track
 * @access  Private (Customer)
 */
const trackOrder = asyncHandler(async (req, res) => {
    const trackingData = await orderService.trackOrder(req.params.id, req.user.id);
    return ApiResponse.success(res, trackingData, 'Tracking information retrieved');
});

/**
 * @desc    Get active orders
 * @route   GET /api/v1/orders/active
 * @access  Private (Customer/Rider)
 */
const getActiveOrders = asyncHandler(async (req, res) => {
    const orders = await orderService.getActiveOrders(req.user.id);
    return ApiResponse.success(res, orders, 'Active orders fetched successfully');
});

/**
 * @desc    Update order status
 * @route   PUT /api/v1/orders/:id/status
 * @access  Private (Owner/Rider/Admin)
 */
const updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await orderService.updateStatus(req.params.id, status, req.user);
    return ApiResponse.success(res, order, `Order status updated to ${status}`);
});



/**
 * @desc    Re-order an old order
 * @route   POST /api/v1/orders/:id/reorder
 * @access  Private (Customer)
 */
const reorder = asyncHandler(async (req, res) => {
    const cart = await orderService.reorder(req.params.id, req.user.id);
    return ApiResponse.success(res, cart, 'Items added to cart for reorder');
});

/**
 * @desc    Get summary stats for user orders
 * @route   GET /api/v1/orders/stats
 * @access  Private (Customer)
 */
const getStats = asyncHandler(async (req, res) => {
    const stats = await orderService.getStats(req.user.id);
    return ApiResponse.success(res, stats, 'User dashboard stats fetched');
});

module.exports = {
    createOrder,
    getOrderHistory,
    getOrderDetails,
    cancelOrder,
    trackOrder,
    getActiveOrders,
    updateStatus,
    reorder,
    getStats,
};
