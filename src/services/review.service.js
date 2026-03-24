/**
 * src/services/review.service.js
 * Review Business Logic
 */

const reviewRepository = require('../repositories/review.repository');
const orderRepository = require('../repositories/order.repository');
const restaurantRepository = require('../repositories/restaurant.repository');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS, ROLES } = require('../utils/constants');
const { emitToRoom } = require('../websocket/socket');
const logger = require('../config/logger');

class ReviewService {
    /**
     * Get reviews for a restaurant
     */
    async getRestaurantReviews(restaurantId, query) {
        const { page = 1, limit = 10, sort = 'recent' } = query;

        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
            throw new ApiError(404, 'Restaurant not found');
        }

        const { reviews, total } = await reviewRepository.findByRestaurantId(restaurantId, { page, limit, sort });

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);

        return {
            reviews,
            averageRating: restaurant.averageRating,
            totalReviews: restaurant.totalReviews,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
            },
        };
    }

    /**
     * Create a new review
     */
    async createReview(userId, restaurantId, reviewPayload) {
        const { orderId, rating, comment, foodRating, serviceRating, deliveryRating, images } = reviewPayload;

        // 1. Verify order exists and belongs to user
        const order = await orderRepository.findById(orderId);
        if (!order || order.customerId !== userId) {
            throw new ApiError(404, 'Order not found');
        }

        // 2. Verify restaurant matches order
        if (order.restaurantId !== restaurantId) {
            throw new ApiError(400, 'Order does not belong to this restaurant');
        }

        // 3. Verify order was delivered
        if (order.status !== ORDER_STATUS.DELIVERED) {
            throw new ApiError(400, 'You can only review delivered orders');
        }

        // 4. Check if already reviewed
        const hasExisting = await orderRepository.hasReview(orderId);
        if (hasExisting) {
            throw new ApiError(400, 'This order has already been reviewed');
        }

        // 5. Create review
        const review = await reviewRepository.create({
            orderId,
            customerId: userId,
            restaurantId,
            restaurantRating: parseInt(rating),
            foodRating: parseInt(foodRating || rating),
            deliveryRating: deliveryRating ? parseInt(deliveryRating) : null,
            comment,
            images: images || [],
        });

        // 6. Notify restaurant owner
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (restaurant && restaurant.ownerId) {
            emitToRoom(`user:${restaurant.ownerId}`, 'new_review', {
                reviewId: review.id,
                restaurantName: restaurant.name,
                rating: review.restaurantRating,
                comment: review.comment,
            });
        }

        logger.info(`✨ New review created for restaurant ${restaurantId} by user ${userId}`);

        return review;
    }

    /**
     * Update review
     */
    async updateReview(userId, reviewId, updatePayload) {
        const review = await reviewRepository.findById(reviewId);
        if (!review) {
            throw new ApiError(404, 'Review not found');
        }

        // Authorization: Only customer who wrote it
        if (review.customerId !== userId) {
            throw new ApiError(403, 'You are not authorized to update this review');
        }

        const { rating, comment, foodRating, deliveryRating, images } = updatePayload;

        const updateData = {};
        if (rating) updateData.restaurantRating = parseInt(rating);
        if (foodRating) updateData.foodRating = parseInt(foodRating);
        if (deliveryRating) updateData.deliveryRating = parseInt(deliveryRating);
        if (comment !== undefined) updateData.comment = comment;
        if (images) updateData.images = images;

        return reviewRepository.update(reviewId, updateData);
    }

    /**
     * Delete review
     */
    async deleteReview(userId, role, reviewId) {
        const review = await reviewRepository.findById(reviewId);
        if (!review) {
            throw new ApiError(404, 'Review not found');
        }

        // Authorization: Ownership or Admin
        if (review.customerId !== userId && role !== ROLES.ADMIN) {
            throw new ApiError(403, 'Permission denied');
        }

        return reviewRepository.delete(reviewId);
    }

    /**
     * Toggle helpful vote
     */
    async toggleHelpful(userId, reviewId) {
        const review = await reviewRepository.findById(reviewId);
        if (!review) {
            throw new ApiError(404, 'Review not found');
        }

        const isHelpful = await reviewRepository.toggleHelpful(reviewId, userId);
        return { isHelpful };
    }

    /**
     * Add reply to review (Restaurant Owner)
     */
    async addReply(userId, reviewId, replyText) {
        const review = await reviewRepository.findById(reviewId);
        if (!review) {
            throw new ApiError(404, 'Review not found');
        }

        // Authorization: Verify user is the restaurant owner
        if (review.restaurant.ownerId !== userId) {
            throw new ApiError(403, 'Only the restaurant owner can reply to reviews');
        }

        const updatedReview = await reviewRepository.addReply(reviewId, replyText);

        // Notify customer
        emitToRoom(`user:${review.customerId}`, 'review_reply', {
            reviewId: review.id,
            restaurantName: review.restaurant.name,
            reply: replyText,
        });

        return updatedReview;
    }

    /**
     * Flag review for moderation
     */
    async flagReview(userId, reviewId, reason) {
        const review = await reviewRepository.findById(reviewId);
        if (!review) {
            throw new ApiError(404, 'Review not found');
        }

        const flaggedReview = await reviewRepository.flag(reviewId, userId, reason);

        // Notify Admin (simplified)
        logger.info(`🚩 Review ${reviewId} flagged by user ${userId}. Reason: ${reason}`);
        // emitToRoom('admin_room', 'review_flagged', { reviewId, userId, reason });

        return flaggedReview;
    }
}

module.exports = new ReviewService();
