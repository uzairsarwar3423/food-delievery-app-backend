/**
 * src/controllers/payment.controller.js
 * Payment Endpoints Controller
 */

const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/payment.service');
const ApiResponse = require('../utils/ApiResponse');
const { HTTP_STATUS } = require('../utils/constants');

const createPayment = asyncHandler(async (req, res) => {
    const result = await paymentService.createPayment(req.user.id, req.body);
    return ApiResponse.created(res, result.payment, result.message);
});

const getPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentById(req.params.id, req.user.id);
    return ApiResponse.success(res, payment, 'Payment details fetched successfully');
});

const getPaymentByOrder = asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentByOrderId(req.params.orderId, req.user.id);
    return ApiResponse.success(res, payment, 'Payment for order fetched successfully');
});

const confirmCashPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.confirmCashPayment(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, payment, 'Payment confirmed successfully');
});

const getPaymentHistory = asyncHandler(async (req, res) => {
    const history = await paymentService.getPaymentHistory(req.user.id, req.query);
    // history already has pagination info, but ApiResponse.paginated is more standard
    return ApiResponse.paginated(res, history.payments, history.pagination, 'Payment history fetched successfully');
});

const getRiderCollections = asyncHandler(async (req, res) => {
    const collections = await paymentService.getRiderCollections(req.user.id, req.query);
    return ApiResponse.success(res, collections, 'Rider collections summarized');
});

const riderDeposit = asyncHandler(async (req, res) => {
    const result = await paymentService.riderDeposit(req.user.id, req.body);
    return ApiResponse.created(res, result, 'Cash deposit submitted successfully');
});

const getAvailableMethods = asyncHandler(async (req, res) => {
    const methods = await paymentService.getAvailableMethods();
    return ApiResponse.success(res, methods, 'Available payment methods');
});

module.exports = {
    createPayment,
    getPayment,
    getPaymentByOrder,
    confirmCashPayment,
    getPaymentHistory,
    getRiderCollections,
    riderDeposit,
    getAvailableMethods
};
