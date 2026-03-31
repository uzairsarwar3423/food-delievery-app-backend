const express = require('express');
const earningsController = require('../../controllers/earnings.controller');
const payoutValidator = require('../../validators/payout.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const { dashboardLimiter } = require('../../middlewares/rateLimiter.middleware');

const router = express.Router();

// All routes require authentication and DELIVERY_PERSON role
router.use(authenticate, authorize('DELIVERY_PERSON'));

router.get('/summary', dashboardLimiter, earningsController.getEarningsSummary);
router.get('/today', dashboardLimiter, earningsController.getTodayEarnings);
router.get('/trips', dashboardLimiter, validate(payoutValidator.tripHistoryFilters), earningsController.getTripHistory);
router.get('/breakdown', dashboardLimiter, validate(payoutValidator.breakdownPeriod), earningsController.getEarningsBreakdown);

module.exports = router;
