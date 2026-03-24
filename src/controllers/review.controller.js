/**
 * src/controllers/review.controller.js
 * Review Endpoints Controller
 */

const reviewService = require('../services/review.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get restaurant reviews
 * @route   GET /api/v1/restaurants/:restaurantId/reviews
 * @access  Public
 */
const getRestaurantReviews = asyncHandler(async (req, res) => {
    const result = await reviewService.getRestaurantReviews(req.params.restaurantId, req.query);
    return ApiResponse.paginated(res, result.reviews, result.pagination, 'Reviews fetched successfully');
});

/**
 * @desc    Post a review for a restaurant
 * @route   POST /api/v1/restaurants/:restaurantId/reviews
 * @access  Private (Customer)
 */
const createReview = asyncHandler(async (req, res) => {
    const review = await reviewService.createReview(req.user.id, req.params.restaurantId, req.body);
    return ApiResponse.created(res, review, 'Review posted successfully');
});

/**
 * @desc    Update a review
 * @route   PUT /api/v1/reviews/:id
 * @access  Private (Customer)
 */
const updateReview = asyncHandler(async (req, res) => {
    const review = await reviewService.updateReview(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, review, 'Review updated successfully');
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/v1/reviews/:id
 * @access  Private (Owner/Admin)
 */
const deleteReview = asyncHandler(async (req, res) => {
    await reviewService.deleteReview(req.user.id, req.user.role, req.params.id);
    return ApiResponse.success(res, null, 'Review deleted successfully');
});

/**
 * @desc    Toggle helpful vote on a review
 * @route   POST /api/v1/reviews/:id/helpful
 * @access  Private (Customer)
 */
const toggleHelpful = asyncHandler(async (req, res) => {
    const result = await reviewService.toggleHelpful(req.user.id, req.params.id);
    return ApiResponse.success(res, result, result.isHelpful ? 'Marked as helpful' : 'Helpful vote removed');
});

/**
 * @desc    Reply to a review (Restaurant Owner)
 * @route   POST /api/v1/reviews/:id/reply
 * @access  Private (Restaurant Owner)
 */
const addReply = asyncHandler(async (req, res) => {
    const { reply } = req.body;
    const review = await reviewService.addReply(req.user.id, req.params.id, reply);
    return ApiResponse.success(res, review, 'Reply posted successfully');
});

/**
 * @desc    Flag a review for moderation
 * @route   PUT /api/v1/reviews/:id/flag
 * @access  Private (Customer)
 */
const flagReview = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    await reviewService.flagReview(req.user.id, req.params.id, reason);
    return ApiResponse.success(res, null, 'Review flagged for moderation');
});

module.exports = {
    getRestaurantReviews,
    createReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    addReply,
    flagReview,
};
