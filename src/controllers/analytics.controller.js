/**
 * src/controllers/analytics.controller.js
 * Analytics Endpoints Controller
 */

const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get dashboard summary statistics
 * @route   GET /api/v1/orders/stats
 * @access  Private (Restaurant Owner)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    const stats = await analyticsService.getDashboardStats(req.restaurantId);
    return ApiResponse.success(res, stats, 'Dashboard stats fetched successfully');
});

/**
 * @desc    Get earnings today and growth vs yesterday
 * @route   GET /api/v1/earnings/today
 * @access  Private (Restaurant Owner)
 */
const getTodayEarnings = asyncHandler(async (req, res) => {
    const earnings = await analyticsService.getTodayEarnings(req.restaurantId);
    return ApiResponse.success(res, earnings, 'Today\'s earnings fetched successfully');
});

/**
 * @desc    Get revenue summary (weekly, monthly, yearly)
 * @route   GET /api/v1/earnings/summary
 * @access  Private (Restaurant Owner)
 */
const getRevenueSummary = asyncHandler(async (req, res) => {
    const summary = await analyticsService.getRevenueSummary(req.restaurantId);
    return ApiResponse.success(res, summary, 'Revenue summary fetched successfully');
});

/**
 * @desc    Get revenue & orders breakdown
 * @route   GET /api/v1/earnings/breakdown
 * @access  Private (Restaurant Owner)
 */
const getEarningsBreakdown = asyncHandler(async (req, res) => {
    const { period = 'daily' } = req.query;
    const breakdown = await analyticsService.getEarningsBreakdown(req.restaurantId, period);
    return ApiResponse.success(res, breakdown, `Earnings breakdown (${period}) fetched successfully`);
});

/**
 * @desc    Get top and bottom performing menu items
 * @route   GET /api/v1/analytics/top-items
 * @access  Private (Restaurant Owner)
 */
const getTopItems = asyncHandler(async (req, res) => {
    const items = await analyticsService.getMenuItemPerformance(req.restaurantId);
    return ApiResponse.success(res, items, 'Menu item performance fetched successfully');
});

/**
 * @desc    Get revenue distribution by category
 * @route   GET /api/v1/analytics/category-distribution
 * @access  Private (Restaurant Owner)
 */
const getCategoryDistribution = asyncHandler(async (req, res) => {
    const distribution = await analyticsService.getCategoryDistribution(req.restaurantId);
    return ApiResponse.success(res, distribution, 'Category distribution fetched successfully');
});

/**
 * @desc    Get peak hours for orders
 * @route   GET /api/v1/analytics/peak-hours
 * @access  Private (Restaurant Owner)
 */
const getPeakHours = asyncHandler(async (req, res) => {
    const peakHours = await analyticsService.getPeakHours(req.restaurantId);
    return ApiResponse.success(res, peakHours, 'Peak hours fetched successfully');
});

module.exports = {
    getDashboardStats,
    getTodayEarnings,
    getRevenueSummary,
    getEarningsBreakdown,
    getTopItems,
    getCategoryDistribution,
    getPeakHours,
};
