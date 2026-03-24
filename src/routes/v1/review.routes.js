/**
 * src/routes/v1/review.routes.js
 * Review Routes
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/review.controller');
const reviewValidator = require('../../validators/review.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../utils/constants');

/**
 * ─── Restaurant Level Routes ─────────────────────────────────
 */

/**
 * GET /api/v1/restaurants/:restaurantId/reviews
 * Fetch restaurant reviews (Public)
 */
router.get('/restaurants/:restaurantId/reviews',
    validate(reviewValidator.getRestaurantReviews),
    reviewController.getRestaurantReviews
);

/**
 * POST /api/v1/restaurants/:restaurantId/reviews
 * Create a review (Auth Required)
 */
router.post('/restaurants/:restaurantId/reviews',
    authenticate,
    validate(reviewValidator.createReview),
    reviewController.createReview
);

/**
 * ─── Individual Review Level Routes ──────────────────────────
 */

/**
 * PUT /api/v1/reviews/:id
 * Update review (Ownership)
 */
router.put('/reviews/:id',
    authenticate,
    validate(reviewValidator.updateReview),
    reviewController.updateReview
);

/**
 * DELETE /api/v1/reviews/:id
 * Delete review (Ownership/Admin)
 */
router.delete('/reviews/:id',
    authenticate,
    validate(reviewValidator.reviewIdParam),
    reviewController.deleteReview
);

/**
 * POST /api/v1/reviews/:id/helpful
 * Vote helpful (Auth Required)
 */
router.post('/reviews/:id/helpful',
    authenticate,
    validate(reviewValidator.reviewIdParam),
    reviewController.toggleHelpful
);

/**
 * POST /api/v1/reviews/:id/reply
 * Owner reply (Restaurant Owner only)
 */
router.post('/reviews/:id/reply',
    authenticate,
    authorize(ROLES.RESTAURANT_OWNER, ROLES.ADMIN),
    validate(reviewValidator.addReply),
    reviewController.addReply
);

/**
 * PUT /api/v1/reviews/:id/flag
 * Report/Flag review
 */
router.put('/reviews/:id/flag',
    authenticate,
    validate(reviewValidator.flagReview),
    reviewController.flagReview
);

module.exports = router;
