/**
 * src/routes/v1/deals.routes.js
 * Deals routes
 */

const express = require('express');
const dealsController = require('../../controllers/deals.controller');
const { getDealsValidator, applyDealValidator, dealIdValidator } = require('../../validators/deals.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, optionalAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * Public/Optional Auth Routes
 */
router.get('/', optionalAuth, validate(getDealsValidator), dealsController.getDeals);
router.get('/featured', optionalAuth, dealsController.getFeaturedDeals);
router.get('/restaurant/:restaurantId', optionalAuth, dealsController.getRestaurantDeals);
router.get('/:id', optionalAuth, validate(dealIdValidator), dealsController.getDealById);

/**
 * Protected Routes
 */
router.get('/my/usage', authenticate, dealsController.getMyUsageHistory);
router.post('/:id/apply', authenticate, validate(applyDealValidator), dealsController.applyDeal);
router.post('/:id/favorite', authenticate, validate(dealIdValidator), dealsController.toggleFavorite);
router.delete('/:id/favorite', authenticate, validate(dealIdValidator), dealsController.toggleFavorite);

module.exports = router;
