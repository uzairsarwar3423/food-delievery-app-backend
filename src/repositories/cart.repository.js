/**
 * src/repositories/cart.repository.js
 * Cart Data Access Layer — Optimized
 */

const { prisma } = require('../config/database');

// Shared select for cart items — avoids over-fetching
const CART_ITEM_SELECT = {
    id: true,
    userId: true,
    menuItemId: true,
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
            restaurantId: true,
            restaurant: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    isOpen: true,
                    deliveryFee: true,
                    minimumOrderAmount: true,
                    status: true,
                },
            },
        },
    },
};

class CartRepository {
    /**
     * Find all cart items for a user WITH active coupon — single query
     */
    async findByUserIdWithCoupon(userId) {
        const [cartItems, userInfo] = await Promise.all([
            prisma.cartItem.findMany({
                where: { userId },
                select: CART_ITEM_SELECT,
                orderBy: { createdAt: 'asc' },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    activeCoupon: {
                        select: {
                            id: true,
                            code: true,
                            description: true,
                            type: true,
                            discountValue: true,
                            maximumDiscountAmount: true,
                            minimumOrderAmount: true,
                        },
                    },
                },
            }),
        ]);
        return { cartItems, activeCoupon: userInfo?.activeCoupon ?? null };
    }

    /**
     * Find all cart items for a user (lightweight, no coupon)
     */
    async findByUserId(userId) {
        return prisma.cartItem.findMany({
            where: { userId },
            select: CART_ITEM_SELECT,
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Find specific cart item by user and menu item (unique compound index)
     */
    async findItem(userId, menuItemId) {
        return prisma.cartItem.findUnique({
            where: { userId_menuItemId: { userId, menuItemId } },
            select: {
                id: true,
                userId: true,
                menuItemId: true,
                quantity: true,
                priceAtAddition: true,
            },
        });
    }

    /**
     * Find cart item by its unique ID
     */
    async findItemById(id) {
        return prisma.cartItem.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                menuItemId: true,
                quantity: true,
                menuItem: {
                    select: {
                        id: true,
                        restaurantId: true,
                        restaurant: { select: { id: true, name: true } },
                    },
                },
            },
        });
    }

    /**
     * Upsert a cart item — avoids two round-trips (findItem + addItem)
     */
    async upsertItem({ userId, menuItemId, quantity, customizations, priceAtAddition }) {
        return prisma.cartItem.upsert({
            where: { userId_menuItemId: { userId, menuItemId } },
            create: {
                userId,
                menuItemId,
                quantity,
                customizations: customizations || {},
                priceAtAddition,
            },
            update: {
                quantity: { increment: quantity },
                priceAtAddition, // Refresh price on each add
            },
            select: { id: true, quantity: true },
        });
    }

    /**
     * Add item to cart (explicit create)
     */
    async addItem(data) {
        return prisma.cartItem.create({
            data,
            select: { id: true, quantity: true },
        });
    }

    /**
     * Update cart item quantity or other fields
     */
    async updateItem(id, data) {
        return prisma.cartItem.update({
            where: { id },
            data,
            select: { id: true, quantity: true },
        });
    }

    /**
     * Delete a specific cart item
     */
    async deleteItem(id) {
        return prisma.cartItem.delete({ where: { id } });
    }

    /**
     * Clear all items for a user
     */
    async clearCart(userId) {
        return prisma.cartItem.deleteMany({ where: { userId } });
    }

    /**
     * Clear applied coupon for a user
     */
    async clearCoupon(userId) {
        return prisma.user.update({
            where: { id: userId },
            data: { activeCouponId: null },
            select: { id: true },
        });
    }

    /**
     * Update user's active coupon
     */
    async updateActiveCoupon(userId, couponId) {
        return prisma.user.update({
            where: { id: userId },
            data: { activeCouponId: couponId },
            select: { id: true },
        });
    }

    /**
     * Get user with active coupon only (legacy)
     */
    async getUserCartInfo(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
            include: { activeCoupon: true },
        });
    }
}

module.exports = new CartRepository();
