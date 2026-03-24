const express = require('express');
const earningsController = require('../../controllers/earnings.controller');
const payoutValidator = require('../../validators/payout.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize.middleware');

const router = express.Router();

// All routes require authentication and DELIVERY_PERSON role
router.use(authenticate, authorize('DELIVERY_PERSON'));

router.get('/summary', earningsController.getEarningsSummary);
router.get('/today', earningsController.getTodayEarnings);
router.get('/trips', validate(payoutValidator.tripHistoryFilters), earningsController.getTripHistory);
router.get('/breakdown', validate(payoutValidator.breakdownPeriod), earningsController.getEarningsBreakdown);

module.exports = router;
