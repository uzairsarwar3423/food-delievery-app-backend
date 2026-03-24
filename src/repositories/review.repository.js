/**
 * src/repositories/review.repository.js
 * Review Data Access Layer
 */

const { prisma } = require('../config/database');

class ReviewRepository {
    /**
     * Create a new review and update ratings
     */
    async create(reviewData) {
        return prisma.$transaction(async (tx) => {
            // 1. Create the review
            const review = await tx.review.create({
                data: reviewData,
                include: {
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        },
                    },
                },
            });

            // 2. Update Restaurant Average Rating
            await this._updateRestaurantRating(tx, review.restaurantId);

            // 3. Update Rider Average Rating (if deliveryRating provided)
            if (review.deliveryRating) {
                const order = await tx.order.findUnique({
                    where: { id: review.orderId },
                    select: { deliveryPersonId: true },
                });

                if (order && order.deliveryPersonId) {
                    await this._updateRiderRating(tx, order.deliveryPersonId);
                }
            }

            return review;
        });
    }

    /**
     * Find review by ID
     */
    async findById(id) {
        return prisma.review.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                    },
                },
            },
        });
    }

    /**
     * Find reviews for a restaurant with pagination and sorting
     */
    async findByRestaurantId(restaurantId, { page = 1, limit = 10, sort = 'recent' }) {
        const skip = (page - 1) * limit;

        let orderBy = { createdAt: 'desc' };
        if (sort === 'helpful') {
            orderBy = { helpfulCount: 'desc' };
        } else if (sort === 'rating_high') {
            orderBy = { restaurantRating: 'desc' };
        } else if (sort === 'rating_low') {
            orderBy = { restaurantRating: 'asc' };
        }

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where: {
                    restaurantId,
                    isFlagged: false, // Don't show flagged reviews
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: parseInt(limit),
            }),
            prisma.review.count({
                where: {
                    restaurantId,
                    isFlagged: false,
                }
            }),
        ]);

        return { reviews, total };
    }

    /**
     * Update a review
     */
    async update(id, data) {
        return prisma.$transaction(async (tx) => {
            const updatedReview = await tx.review.update({
                where: { id },
                data,
            });

            // Recalculate ratings if rating fields were updated
            if (data.restaurantRating || data.foodRating) {
                await this._updateRestaurantRating(tx, updatedReview.restaurantId);
            }

            if (data.deliveryRating) {
                const order = await tx.order.findUnique({
                    where: { id: updatedReview.orderId },
                    select: { deliveryPersonId: true },
                });
                if (order && order.deliveryPersonId) {
                    await this._updateRiderRating(tx, order.deliveryPersonId);
                }
            }

            return updatedReview;
        });
    }

    /**
     * Delete a review
     */
    async delete(id) {
        return prisma.$transaction(async (tx) => {
            const review = await tx.review.findUnique({
                where: { id },
            });

            if (!review) return null;

            await tx.review.delete({
                where: { id },
            });

            // Recalculate ratings
            await this._updateRestaurantRating(tx, review.restaurantId);

            const order = await tx.order.findUnique({
                where: { id: review.orderId },
                select: { deliveryPersonId: true },
            });
            if (order && order.deliveryPersonId) {
                await this._updateRiderRating(tx, order.deliveryPersonId);
            }

            return { id };
        });
    }

    /**
     * Toggle helpful vote
     */
    async toggleHelpful(reviewId, userId) {
        return prisma.$transaction(async (tx) => {
            const existingVote = await tx.reviewHelpfulVote.findUnique({
                where: {
                    reviewId_userId: { reviewId, userId },
                },
            });

            if (existingVote) {
                // Remove vote
                await tx.reviewHelpfulVote.delete({
                    where: { id: existingVote.id },
                });
                await tx.review.update({
                    where: { id: reviewId },
                    data: { helpfulCount: { decrement: 1 } },
                });
                return false; // isHelpful: false
            } else {
                // Add vote
                await tx.reviewHelpfulVote.create({
                    data: { reviewId, userId },
                });
                await tx.review.update({
                    where: { id: reviewId },
                    data: { helpfulCount: { increment: 1 } },
                });
                return true; // isHelpful: true
            }
        });
    }

    /**
     * Add reply to review
     */
    async addReply(id, replyText) {
        return prisma.review.update({
            where: { id },
            data: {
                restaurantReply: replyText,
                repliedAt: new Date(),
            },
        });
    }

    /**
     * Flag review for moderation
     */
    async flag(reviewId, userId, reason) {
        return prisma.$transaction(async (tx) => {
            await tx.reviewFlag.create({
                data: {
                    reviewId,
                    userId,
                    reason,
                },
            });

            return tx.review.update({
                where: { id: reviewId },
                data: { isFlagged: true },
            });
        });
    }

    /**
     * Get average rating for a restaurant
     */
    async getRestaurantAverageRating(restaurantId) {
        const stats = await prisma.review.aggregate({
            where: { restaurantId },
            _avg: { restaurantRating: true },
            _count: { _all: true },
        });

        return {
            averageRating: stats._avg.restaurantRating || 0,
            totalReviews: stats._count._all,
        };
    }

    /**
     * Private: Update Restaurant Rating
     */
    async _updateRestaurantRating(tx, restaurantId) {
        const stats = await tx.review.aggregate({
            where: { restaurantId },
            _avg: { restaurantRating: true },
            _count: { _all: true },
        });

        await tx.restaurant.update({
            where: { id: restaurantId },
            data: {
                averageRating: stats._avg.restaurantRating || 0,
                totalReviews: stats._count._all,
            },
        });
    }

    /**
     * Private: Update Rider Rating
     */
    async _updateRiderRating(tx, riderId) {
        const stats = await tx.review.aggregate({
            where: {
                order: {
                    deliveryPersonId: riderId,
                },
                deliveryRating: { not: null },
            },
            _avg: { deliveryRating: true },
            _count: { _all: true },
        });

        await tx.deliveryPerson.update({
            where: { id: riderId },
            data: {
                averageRating: stats._avg.deliveryRating || 0,
                totalReviews: stats._count._all,
            },
        });
    }
}

module.exports = new ReviewRepository();
