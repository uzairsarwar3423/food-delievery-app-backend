const earningsService = require('../services/earnings.service');
const riderRepository = require('../repositories/rider.repository');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../utils/constants');

const getPendingPayout = asyncHandler(async (req, res) => {
    const rider = await riderRepository.findByUserId(req.user.id);
    if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

    const pending = await earningsService.getPendingPayoutDetails(rider.id);
    res.status(HTTP_STATUS.OK).send({
        status: 'success',
        data: pending
    });
});

const requestPayout = asyncHandler(async (req, res) => {
    const rider = await riderRepository.findByUserId(req.user.id);
    if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

    const { amount } = req.body;
    const payoutRequest = await earningsService.requestPayout(rider.id, { amount: parseFloat(amount) });

    res.status(HTTP_STATUS.CREATED).send({
        status: 'success',
        message: 'Payout request created successfully',
        data: payoutRequest
    });
});

const getPayoutHistory = asyncHandler(async (req, res) => {
    const rider = await riderRepository.findByUserId(req.user.id);
    if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

    const { page, limit } = req.query;
    const history = await earningsService.getPayoutHistory(rider.id, {
        page: parseInt(page),
        limit: parseInt(limit)
    });

    res.status(HTTP_STATUS.OK).send({
        status: 'success',
        data: history
    });
});

const getPayoutDetails = asyncHandler(async (req, res) => {
    const rider = await riderRepository.findByUserId(req.user.id);
    if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

    const payout = await earningsService.getPayoutDetails(rider.id, req.params.id);
    res.status(HTTP_STATUS.OK).send({
        status: 'success',
        data: payout
    });
});

module.exports = {
    getPendingPayout,
    requestPayout,
    getPayoutHistory,
    getPayoutDetails
};
