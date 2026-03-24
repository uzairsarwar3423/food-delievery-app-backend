const earningsService = require('../services/earnings.service');
const riderRepository = require('../repositories/rider.repository');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../utils/constants');

const getEarningsSummary = asyncHandler(async (req, res) => {
    const rider = await riderRepository.findByUserId(req.user.id);
    if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

    const summary = await earningsService.getEarningsSummary(rider.id);
    res.status(HTTP_STATUS.OK).send({
        status: 'success',
        data: summary
    });
});

const getTodayEarnings = asyncHandler(async (req, res) => {
    const rider = await riderRepository.findByUserId(req.user.id);
    if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

    const todayEarnings = await earningsService.getTodayEarnings(rider.id);
    res.status(HTTP_STATUS.OK).send({
        status: 'success',
        data: todayEarnings
    });
});

const getTripHistory = asyncHandler(async (req, res) => {
    const rider = await riderRepository.findByUserId(req.user.id);
    if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

    const { page, limit, dateFrom, dateTo } = req.query;
    const history = await earningsService.getTripHistory(rider.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        dateFrom,
        dateTo
    });

    res.status(HTTP_STATUS.OK).send({
        status: 'success',
        data: history
    });
});

const getEarningsBreakdown = asyncHandler(async (req, res) => {
    const rider = await riderRepository.findByUserId(req.user.id);
    if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

    const { period } = req.query;
    const breakdown = await earningsService.getEarningsBreakdown(rider.id, period);

    res.status(HTTP_STATUS.OK).send({
        status: 'success',
        data: breakdown
    });
});

module.exports = {
    getEarningsSummary,
    getTodayEarnings,
    getTripHistory,
    getEarningsBreakdown
};
