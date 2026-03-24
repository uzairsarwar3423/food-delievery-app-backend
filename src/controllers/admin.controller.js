/**
 * src/controllers/admin.controller.js
 * Admin Controller
 */

const adminService = require('../services/admin.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getDashboardData = asyncHandler(async (req, res) => {
    const result = await adminService.getDashboardData();
    return ApiResponse.success(res, result, 'Dashboard data fetched');
});

const getUsers = asyncHandler(async (req, res) => {
    const result = await adminService.getUsers(req.query);
    return ApiResponse.success(res, result.users, 'Users fetched', 200);
    // Note: ApiResponse.paginated could be used here too
});

const updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const result = await adminService.updateUserStatus(req.user.id, id, isActive);
    return ApiResponse.success(res, result, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
});

const getPendingRestaurants = asyncHandler(async (req, res) => {
    const result = await adminService.getPendingRestaurants();
    return ApiResponse.success(res, result, 'Pending restaurants fetched');
});

const approveRestaurant = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await adminService.approveRestaurant(req.user.id, id);
    return ApiResponse.success(res, result, 'Restaurant approved successfully');
});

const rejectRestaurant = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await adminService.rejectRestaurant(req.user.id, id, reason);
    return ApiResponse.success(res, result, 'Restaurant rejected successfully');
});

const getPendingRiders = asyncHandler(async (req, res) => {
    const result = await adminService.getPendingRiders();
    return ApiResponse.success(res, result, 'Pending rider verifications fetched');
});

const verifyRiderDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const result = await adminService.verifyRiderDocument(req.user.id, id, status, rejectionReason);
    return ApiResponse.success(res, result, 'Rider document verification updated');
});

const getOrders = asyncHandler(async (req, res) => {
    const result = await adminService.getOrders(req.query);
    return ApiResponse.success(res, result, 'Orders fetched');
});

const getRevenueAnalytics = asyncHandler(async (req, res) => {
    const result = await adminService.getRevenueAnalytics(req.query);
    return ApiResponse.success(res, result, 'Revenue analytics fetched');
});

const getOrderAnalytics = asyncHandler(async (req, res) => {
    const result = await adminService.getOrderAnalytics(req.query);
    return ApiResponse.success(res, result, 'Order analytics fetched');
});

const getUserAnalytics = asyncHandler(async (req, res) => {
    const result = await adminService.getUserAnalytics(req.query);
    return ApiResponse.success(res, result, 'User analytics fetched');
});

const getRestaurantAnalytics = asyncHandler(async (req, res) => {
    const result = await adminService.getRestaurantAnalytics();
    return ApiResponse.success(res, result, 'Restaurant analytics fetched');
});

const updateSettings = asyncHandler(async (req, res) => {
    const result = await adminService.updateSettings(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Settings updated');
});

const createCoupon = asyncHandler(async (req, res) => {
    const result = await adminService.createCoupon(req.user.id, req.body);
    return ApiResponse.created(res, result, 'Coupon created successfully');
});

const processPayout = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes, transactionId } = req.body;
    const result = await adminService.processPayout(req.user.id, id, status, adminNotes, transactionId);
    return ApiResponse.success(res, result, 'Payout processed successfully');
});

module.exports = {
    getDashboardData,
    getUsers,
    updateUserStatus,
    getPendingRestaurants,
    approveRestaurant,
    rejectRestaurant,
    getPendingRiders,
    verifyRiderDocument,
    getOrders,
    getRevenueAnalytics,
    getOrderAnalytics,
    getUserAnalytics,
    getRestaurantAnalytics,
    updateSettings,
    createCoupon,
    processPayout,
};
