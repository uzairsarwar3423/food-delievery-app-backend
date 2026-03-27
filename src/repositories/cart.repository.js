/**
 * src/repositories/cart.repository.js
 * Cart Data Access Layer
 */

const { prisma } = require('../config/database');

class CartRepository {
    /**
     * Find all cart items for a user
     */
    async findByUserId(userId) {
        return prisma.cartItem.findMany({
            where: { userId },
            select: {
                id: true,
                quantity: true,
                customizations: true,
                specialNote: true,
                priceAtAddition: true,
                menuItem: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        discountedPrice: true,
                        imageUrl: true,
                        isAvailable: true,
                        restaurant: {
                            select: {
                                id: true,
                                name: true,
                                isOpen: true,
                                deliveryFee: true,
                                status: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Find specific cart item by user and menu item
     */
    async findItem(userId, menuItemId) {
        return prisma.cartItem.findUnique({
            where: {
                userId_menuItemId: { userId, menuItemId },
            },
            include: {
                menuItem: {
                    include: {
                        restaurant: true,
                    },
                },
            },
        });
    }

    /**
     * Find cart item by its unique ID
     */
    async findItemById(id) {
        return prisma.cartItem.findUnique({
            where: { id },
            include: {
                menuItem: {
                    include: {
                        restaurant: true,
                    },
                },
            },
        });
    }

    /**
     * Add item to cart
     */
    async addItem(data) {
        return prisma.cartItem.create({
            data,
            include: {
                menuItem: {
                    include: {
                        restaurant: true,
                    },
                },
            },
        });
    }

    /**
     * Update cart item quantity or other fields
     */
    async updateItem(id, data) {
        return prisma.cartItem.update({
            where: { id },
            data,
            include: {
                menuItem: {
                    include: {
                        restaurant: true,
                    },
                },
            },
        });
    }

    /**
     * Delete a specific cart item
     */
    async deleteItem(id) {
        return prisma.cartItem.delete({
            where: { id },
        });
    }

    /**
     * Clear all items for a user
     */
    async clearCart(userId) {
        return prisma.cartItem.deleteMany({
            where: { userId },
        });
    }

    /**
     * Clear applied coupon for a user
     */
    async clearCoupon(userId) {
        return prisma.user.update({
            where: { id: userId },
            data: { activeCouponId: null },
        });
    }

    /**
     * Update user's active coupon
     */
    async updateActiveCoupon(userId, couponId) {
        return prisma.user.update({
            where: { id: userId },
            data: { activeCouponId: couponId },
        });
    }

    /**
     * Get user with active coupon and cart items
     */
    async getUserCartInfo(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
            include: {
                activeCoupon: true,
            },
        });
    }
}

module.exports = new CartRepository();
