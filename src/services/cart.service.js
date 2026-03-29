/**
 * src/services/cart.service.js
 * Cart Business Logic and Calculations
 */

const cartRepository = require('../repositories/cart.repository');
const menuRepository = require('../repositories/menu.repository');
const couponRepository = require('../repositories/coupon.repository');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class CartService {
    /**
     * Get all cart items with complete calculations
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async getCart(userId) {
        const cartItems = await cartRepository.findByUserId(userId);
        const userInfo = await cartRepository.getUserCartInfo(userId);
        const activeCoupon = userInfo.activeCoupon;

        if (cartItems.length === 0) {
            return {
                items: [],
                restaurant: null,
                totals: {
                    subtotal: 0,
                    deliveryFee: 0,
                    tax: 0,
                    discount: 0,
                    total: 0,
                },
                appliedCoupon: null,
            };
        }

        // Since restaurant locking is enforced, all items belong to the same restaurant
        const restaurant = cartItems[0].menuItem.restaurant;

        const totals = this.calculateTotals(cartItems, restaurant, activeCoupon);

        return {
            items: cartItems,
            restaurant: {
                id: restaurant.id,
                name: restaurant.name,
                slug: restaurant.slug,
                isOpen: restaurant.isOpen,
                deliveryFee: restaurant.deliveryFee,
                minimumOrderAmount: restaurant.minimumOrderAmount,
            },
            totals,
            appliedCoupon: activeCoupon ? {
                id: activeCoupon.id,
                code: activeCoupon.code,
                description: activeCoupon.description,
            } : null,
        };
    }

    /**
     * Add item to cart
     * @param {string} userId
     * @param {Object} itemData
     * @returns {Promise<Object>}
     */
    async addItemToCart(userId, itemData) {
        const start = Date.now();
        console.log(`[PERF] addItemToCart started for user ${userId}`);

        const { menuItemId, quantity, customizations, clearIfDifferentRestaurant } = itemData;

        const menuItemStart = Date.now();
        const menuItem = await menuRepository.findById(menuItemId);
        console.log(`[PERF] menuRepository.findById took ${Date.now() - menuItemStart}ms`);

        if (!menuItem) {
            throw new ApiError(404, 'Menu item not found');
        }

        if (!menuItem.isAvailable) {
            throw new ApiError(400, 'This item is currently unavailable');
        }

        // Check restaurant locking
        const findExistingStart = Date.now();
        const existingItems = await cartRepository.findByUserId(userId);
        console.log(`[PERF] cartRepository.findByUserId took ${Date.now() - findExistingStart}ms`);

        if (existingItems.length > 0) {
            const firstItemRestaurantId = existingItems[0].menuItem.restaurantId;
            if (firstItemRestaurantId !== menuItem.restaurantId) {
                if (!clearIfDifferentRestaurant) {
                    throw new ApiError(400, 'Cart already contains items from another restaurant', {
                        type: 'RESTAURANT_CONFLICT',
                        currentRestaurant: existingItems[0].menuItem.restaurant.name,
                    });
                }
                // Clear cart for this user
                const clearCartStart = Date.now();
                await cartRepository.clearCart(userId);
                await cartRepository.clearCoupon(userId);
                console.log(`[PERF] clearCart/clearCoupon took ${Date.now() - clearCartStart}ms`);
            }
        }

        // Check if item already exists in cart
        const existingItem = existingItems.find(item => item.menuItemId === menuItemId);

        if (existingItem) {
            // Update quantity
            const updateItemStart = Date.now();
            await cartRepository.updateItem(existingItem.id, {
                quantity: existingItem.quantity + quantity,
                priceAtAddition: menuItem.price, // Refresh price
            });
            console.log(`[PERF] cartRepository.updateItem took ${Date.now() - updateItemStart}ms`);
        } else {
            // Add new item
            const addItemStart = Date.now();
            await cartRepository.addItem({
                userId,
                menuItemId,
                quantity,
                customizations: customizations || {},
                priceAtAddition: menuItem.price, // Lock current price
            });
            console.log(`[PERF] cartRepository.addItem took ${Date.now() - addItemStart}ms`);
        }

        const getCartStart = Date.now();
        const result = await this.getCart(userId);
        console.log(`[PERF] this.getCart took ${Date.now() - getCartStart}ms`);

        console.log(`[PERF] addItemToCart total took ${Date.now() - start}ms`);
        return result;
    }

    /**
     * Update cart item quantity
     * @param {string} userId
     * @param {string} itemId
     * @param {number} quantity
     * @returns {Promise<Object>}
     */
    async updateItemQuantity(userId, itemId, quantity) {
        const item = await cartRepository.findItemById(itemId);
        if (!item) {
            throw new ApiError(404, 'Cart item not found');
        }

        if (item.userId !== userId) {
            throw new ApiError(403, 'Forbidden: This cart entry does not belong to you');
        }

        if (quantity <= 0) {
            await cartRepository.deleteItem(itemId);
        } else {
            await cartRepository.updateItem(itemId, { quantity });
        }

        return this.getCart(userId);
    }

    /**
     * Remove item from cart
     * @param {string} userId
     * @param {string} itemId
     * @returns {Promise<Object>}
     */
    async removeItemFromCart(userId, itemId) {
        const item = await cartRepository.findItemById(itemId);
        if (!item) {
            throw new ApiError(404, 'Cart item not found');
        }

        if (item.userId !== userId) {
            throw new ApiError(403, 'Forbidden');
        }

        await cartRepository.deleteItem(itemId);

        // Get current cart - clearCoupon will be handled after re-calculating if needed
        // But usually we just keep the coupon if it still works.
        // The requirement says: "If cart empty, clear restaurant lock".
        // This happens naturally by the logic in getCart (null restaurant).

        return this.getCart(userId);
    }

    /**
     * Clear entire cart
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async clearCart(userId) {
        await cartRepository.clearCart(userId);
        await cartRepository.clearCoupon(userId);
        return { message: "Cart cleared" };
    }

    /**
     * Apply a coupon to the cart
     * @param {string} userId
     * @param {string} code
     * @returns {Promise<Object>}
     */
    async applyCoupon(userId, code) {
        const coupon = await couponRepository.findByCode(code.toUpperCase());
        if (!coupon) {
            throw new ApiError(400, 'Invalid or expired coupon code');
        }

        // Check validity dates
        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            throw new ApiError(400, 'Coupon is not active at this time');
        }

        // Check usage limits
        if (coupon.usageLimit && coupon.totalUsed >= coupon.usageLimit) {
            throw new ApiError(400, 'Coupon usage limit reached');
        }

        // Check per-user usage limits
        const userUsageCount = await couponRepository.getUsageCount(userId, coupon.id);
        if (userUsageCount >= coupon.usageLimitPerUser) {
            throw new ApiError(400, 'You have already used this coupon');
        }

        const { totals, restaurant } = await this.getCart(userId);
        if (totals.subtotal === 0) {
            throw new ApiError(400, 'Cannot apply coupon to an empty cart');
        }

        // Check restaurant specific coupon
        if (coupon.applicableRestaurantId && coupon.applicableRestaurantId !== restaurant.id) {
            throw new ApiError(400, 'This coupon is not applicable for this restaurant');
        }

        // Check minimum order amount
        if (Number(totals.subtotal) < Number(coupon.minimumOrderAmount)) {
            throw new ApiError(400, `Minimum order of ${coupon.minimumOrderAmount} required for this coupon`);
        }

        await cartRepository.updateActiveCoupon(userId, coupon.id);

        return this.getCart(userId);
    }

    /**
     * Validate cart before checkout
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async validateCart(userId) {
        const cart = await this.getCart(userId);
        const issues = [];

        if (cart.items.length === 0) {
            issues.push('Cart is empty');
            return { valid: false, issues };
        }

        const restaurant = cart.items[0].menuItem.restaurant;

        // Check if restaurant is open
        if (!restaurant.isOpen) {
            issues.push(`Restaurant "${restaurant.name}" is currently closed`);
        }

        // Check minimum order amount
        if (Number(cart.totals.subtotal) < Number(restaurant.minimumOrderAmount)) {
            issues.push(`Minimum order amount of ${restaurant.minimumOrderAmount} not met`);
        }

        // Check each item
        for (const item of cart.items) {
            // Re-fetch current menu item to get latest price and availability
            const currentItem = await menuRepository.findById(item.menuItemId);

            if (!currentItem.isAvailable) {
                issues.push(`Item "${item.menuItem.name}" is no longer available`);
                continue;
            }

            // Check price change significantly (e.g. > 10%)
            const oldPrice = Number(item.priceAtAddition || item.menuItem.price);
            const newPrice = Number(currentItem.price);

            if (Math.abs(newPrice - oldPrice) / oldPrice > 0.1) {
                issues.push(`Price for "${item.menuItem.name}" has changed from ${oldPrice} to ${newPrice}`);
            }
        }

        // Check coupon still valid if exists
        if (cart.appliedCoupon) {
            // Similar logic as applyCoupon but without throwing errors
            // ... (can be simplified if we just want a valid true/false)
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }

    /**
     * Internal helper for calculating cart totals
     */
    calculateTotals(items, restaurant, coupon) {
        let subtotal = 0;
        items.forEach(item => {
            subtotal += Number(item.priceAtAddition || item.menuItem.price) * item.quantity;
        });

        const deliveryFee = Number(restaurant.deliveryFee);
        const tax = subtotal * 0.05; // 5% tax
        let discount = 0;

        if (coupon) {
            switch (coupon.type) {
                case 'PERCENTAGE':
                    discount = subtotal * (Number(coupon.discountValue) / 100);
                    if (coupon.maximumDiscountAmount && discount > Number(coupon.maximumDiscountAmount)) {
                        discount = Number(coupon.maximumDiscountAmount);
                    }
                    break;
                case 'FIXED_AMOUNT':
                    discount = Number(coupon.discountValue);
                    break;
                case 'FREE_DELIVERY':
                    discount = deliveryFee;
                    break;
                default:
                    discount = 0;
            }

            // Discount cannot exceed subtotal (unless it's free delivery)
            if (coupon.type !== 'FREE_DELIVERY' && discount > (subtotal + tax)) {
                discount = subtotal + tax;
            }
        }

        const total = subtotal + deliveryFee + tax - discount;

        return {
            subtotal: parseFloat(subtotal.toFixed(2)),
            deliveryFee: parseFloat(deliveryFee.toFixed(2)),
            tax: parseFloat(tax.toFixed(2)),
            discount: parseFloat(discount.toFixed(2)),
            total: parseFloat(Math.max(0, total).toFixed(2)),
        };
    }
}

module.exports = new CartService();
