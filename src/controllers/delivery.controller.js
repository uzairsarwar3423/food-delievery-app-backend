// =============================================================
// src/controllers/delivery.controller.js — Delivery Controller
// =============================================================

const deliveryService = require('../services/delivery.service');
const catchAsync = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../utils/constants');

const getAvailableDeliveries = catchAsync(async (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Location coordinates are required');
    }
    const deliveries = await deliveryService.getAvailableDeliveries(req.user.id, { latitude, longitude });
    return ApiResponse.success(res, { deliveries }, 'Available deliveries fetched');
});

const acceptDelivery = catchAsync(async (req, res) => {
    const { id: orderId } = req.params;
    const delivery = await deliveryService.acceptDelivery(req.user.id, orderId);
    return ApiResponse.success(res, { delivery }, 'Delivery accepted');
});

const declineDelivery = catchAsync(async (req, res) => {
    const { id: orderId } = req.params;
    const result = await deliveryService.declineDelivery(req.user.id, orderId);
    return ApiResponse.success(res, result, 'Delivery declined');
});

const arriveAtRestaurant = catchAsync(async (req, res) => {
    const { id: orderId } = req.params;
    const order = await deliveryService.arriveAtRestaurant(req.user.id, orderId);
    return ApiResponse.success(res, { order }, 'Arrived at restaurant');
});

const pickupDelivery = catchAsync(async (req, res) => {
    const { id: orderId } = req.params;
    const { verificationCode } = req.body;
    if (!verificationCode) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Verification code is required');
    }
    const order = await deliveryService.pickupDelivery(req.user.id, orderId, verificationCode);
    return ApiResponse.success(res, { order }, 'Order picked up');
});

const updateLocation = catchAsync(async (req, res) => {
    const { latitude, longitude, accuracy, speed, heading } = req.body;
    if (latitude === undefined || longitude === undefined) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Latitude and longitude are required');
    }
    const result = await deliveryService.updateLocation(req.user.id, { latitude, longitude, accuracy, speed, heading });
    return ApiResponse.success(res, result, 'Location updated');
});

const arriveAtCustomer = catchAsync(async (req, res) => {
    const { id: orderId } = req.params;
    const order = await deliveryService.arriveAtCustomer(req.user.id, orderId);
    return ApiResponse.success(res, { order }, 'Arrived at customer');
});

const completeDelivery = catchAsync(async (req, res) => {
    const { id: orderId } = req.params;
    const { verificationCode, proofOfDelivery, notes, cashCollected } = req.body;

    if (!verificationCode) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Verification code is required');
    }

    const proofUrl = req.file ? req.file.path : proofOfDelivery;

    const result = await deliveryService.completeDelivery(req.user.id, orderId, {
        verificationCode,
        proofOfDelivery: proofUrl,
        notes,
        cashCollected
    });

    return ApiResponse.success(res, result, 'Delivery completed successfully');
});

const getHistory = catchAsync(async (req, res) => {
    const { page, limit, dateFrom, dateTo } = req.query;
    const history = await deliveryService.getHistory(req.user.id, { page, limit, dateFrom, dateTo });
    return ApiResponse.success(res, history, 'Delivery history fetched');
});

const reportIssue = catchAsync(async (req, res) => {
    const { id: orderId } = req.params;
    const { issueType, description, images } = req.body;
    const issue = await deliveryService.reportIssue(req.user.id, orderId, { issueType, description, images });
    return ApiResponse.created(res, { issueId: issue.id }, 'Issue reported');
});

module.exports = {
    getAvailableDeliveries,
    acceptDelivery,
    declineDelivery,
    arriveAtRestaurant,
    pickupDelivery,
    updateLocation,
    arriveAtCustomer,
    completeDelivery,
    getHistory,
    reportIssue
};
