const express = require('express');
const payoutController = require('../../controllers/payout.controller');
const payoutValidator = require('../../validators/payout.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize.middleware');

const router = express.Router();

// All routes require authentication and DELIVERY_PERSON role
router.use(authenticate, authorize('DELIVERY_PERSON'));

router.get('/pending', payoutController.getPendingPayout);
router.post('/request', validate(payoutValidator.requestPayout), payoutController.requestPayout);
router.get('/history', validate(payoutValidator.payoutHistoryFilters), payoutController.getPayoutHistory);
router.get('/:id', payoutController.getPayoutDetails);

module.exports = router;
