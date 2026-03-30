/**
 * src/routes/v1/analytics.routes.js
 * Analytics Routes for Restaurant Owners
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../../controllers/analytics.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const restaurantAuth = require('../../middlewares/restaurantAuth.middleware');

// All analytics routes require authentication and restaurant owner context
router.use(authenticate, restaurantAuth);

/**
 * Dashboard & Order Stats
 * GET /api/v1/orders/stats
 */
router.get('/orders/stats', analyticsController.getDashboardStats);

/**
 * Earnings Today
 * GET /api/v1/earnings/today
 */
router.get('/earnings/today', analyticsController.getTodayEarnings);

/**
 * Revenue Summary
 * GET /api/v1/earnings/summary
 */
router.get('/earnings/summary', analyticsController.getRevenueSummary);

/**
 * Earnings Breakdown
 * GET /api/v1/earnings/breakdown
 */
router.get('/earnings/breakdown', analyticsController.getEarningsBreakdown);

/**
 * Menu Item Performance
 * GET /api/v1/analytics/top-items
 */
router.get('/analytics/top-items', analyticsController.getTopItems);

/**
 * Category Distribution
 * GET /api/v1/analytics/category-distribution
 */
router.get('/analytics/category-distribution', analyticsController.getCategoryDistribution);

/**
 * Peak Hours
 * GET /api/v1/analytics/peak-hours
 */
router.get('/analytics/peak-hours', analyticsController.getPeakHours);

module.exports = router;
