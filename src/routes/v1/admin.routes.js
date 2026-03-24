const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const adminController = require('../../controllers/admin.controller');

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @route GET /api/v1/admin/dashboard
 * @desc Admin Dashboard Statistics
 * @access Admin
 */
router.get('/dashboard', adminController.getDashboardData);

/**
 * @route GET /api/v1/admin/users
 * @desc Get all users with filters
 * @access Admin
 */
router.get('/users', adminController.getUsers);

/**
 * @route PUT /api/v1/admin/users/:id/status
 * @desc Update user active status
 * @access Admin
 */
router.put('/users/:id/status', adminController.updateUserStatus);

/**
 * @route GET /api/v1/admin/restaurants/pending
 * @desc Fetch restaurants pending approval
 * @access Admin
 */
router.get('/restaurants/pending', adminController.getPendingRestaurants);

/**
 * @route PUT /api/v1/admin/restaurants/:id/approve
 * @desc Approve restaurant registration
 * @access Admin
 */
router.put('/restaurants/:id/approve', adminController.approveRestaurant);

/**
 * @route PUT /api/v1/admin/restaurants/:id/reject
 * @desc Reject restaurant registration
 * @access Admin
 */
router.put('/restaurants/:id/reject', adminController.rejectRestaurant);

/**
 * @route GET /api/v1/admin/riders/pending
 * @desc Fetch riders with unverified documents
 * @access Admin
 */
router.get('/riders/pending', adminController.getPendingRiders);

/**
 * @route PUT /api/v1/admin/riders/:id/verify-document
 * @desc Verify or reject rider document
 * @access Admin
 */
router.put('/riders/documents/:id/verify', adminController.verifyRiderDocument);

/**
 * @route GET /api/v1/admin/orders
 * @desc Fetch all orders with filters
 * @access Admin
 */
router.get('/orders', adminController.getOrders);

/**
 * @route GET /api/v1/admin/analytics/revenue
 * @desc Revenue analytics
 * @access Admin
 */
router.get('/analytics/revenue', adminController.getRevenueAnalytics);

/**
 * @route GET /api/v1/admin/analytics/orders
 * @desc Order analytics
 * @access Admin
 */
router.get('/analytics/orders', adminController.getOrderAnalytics);

/**
 * @route GET /api/v1/admin/analytics/users
 * @desc User analytics
 * @access Admin
 */
router.get('/analytics/users', adminController.getUserAnalytics);

/**
 * @route GET /api/v1/admin/analytics/restaurants
 * @desc Restaurant analytics
 * @access Admin
 */
router.get('/analytics/restaurants', adminController.getRestaurantAnalytics);

/**
 * @route PUT /api/v1/admin/settings
 * @desc Update system settings
 * @access Admin
 */
router.put('/settings', adminController.updateSettings);

/**
 * @route POST /api/v1/admin/coupons
 * @desc Create new coupon
 * @access Admin
 */
router.post('/coupons', adminController.createCoupon);

/**
 * @route PUT /api/v1/admin/payouts/:id/process
 * @desc Process payout request
 * @access Admin
 */
router.put('/payouts/:id/process', adminController.processPayout);

module.exports = router;
