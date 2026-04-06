/**
 * src/services/cart.service.js
 * Cart Business Logic — Redis-cached, parallel, upsert-based
 */

const cartRepository = require('../repositories/cart.repository');
const menuRepository = require('../repositories/menu.repository');
const couponRepository = require('../repositories/coupon.repository');
const ApiError = require('../utils/ApiError');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const logger = require('../config/logger');

const CART_TTL = 120; // seconds — short TTL so stale data risk is low

const cartKey = (userId) => `cart:v2:${userId}`;

class CartService {
    // ─── Cache Helpers ──────────────────────────────────────────

    async _getCartFromCache(userId) {
        try {
            return await cacheGet(cartKey(userId));
        } catch {
            return null;
        }
    }

    async _setCartCache(userId, cart) {
        try {
            await cacheSet(cartKey(userId), cart, CART_TTL);
        } catch {
            // Non-fatal — DB is source of truth
        }
    }

    async _invalidateCart(userId) {
        try {
            await cacheDel(cartKey(userId));
        } catch {
            // Non-fatal
        }
    }

    // ─── Public API ─────────────────────────────────────────────

    /**
     * Get cart with totals — Redis-first, then DB
     */
    async getCart(userId) {
        const cached = await this._getCartFromCache(userId);
        if (cached) {
            return cached;
        }
        const cart = await this._buildCartFromDB(userId);
        await this._setCartCache(userId, cart);
        return cart;
    }

    /**
     * Add item to cart
     * Optimized: parallel fetch of menuItem + existing cart, upsert in single query
     */
    async addItemToCart(userId, itemData) {
        const { menuItemId, quantity, customizations, clearIfDifferentRestaurant } = itemData;

        // 1. Fetch menuItem and existing cart IN PARALLEL — saves one full DB round-trip
        const [menuItem, existingItems] = await Promise.all([
            menuRepository.findByIdForCart(menuItemId),
            cartRepository.findByUserId(userId),
        ]);

        if (!menuItem) throw new ApiError(404, 'Menu item not found');
        if (!menuItem.isAvailable) throw new ApiError(400, 'This item is currently unavailable');

        // 2. Restaurant lock check
        if (existingItems.length > 0) {
            const currentRestaurantId = existingItems[0].menuItem.restaurantId;
            if (currentRestaurantId !== menuItem.restaurantId) {
                if (!clearIfDifferentRestaurant) {
                    throw new ApiError(400, 'Cart already contains items from another restaurant', {
                        type: 'RESTAURANT_CONFLICT',
                        currentRestaurant: existingItems[0].menuItem.restaurant.name,
                    });
                }
                // Clear cart + coupon in parallel
                await Promise.all([
                    cartRepository.clearCart(userId),
                    cartRepository.clearCoupon(userId),
                ]);
            }
        }

        // 3. Upsert (increments qty if already in cart, creates otherwise) — 1 round-trip
        await cartRepository.upsertItem({
            userId,
            menuItemId,
            quantity,
            customizations: customizations || {},
            priceAtAddition: menuItem.discountedPrice ?? menuItem.price,
        });

        // 4. Invalidate cache THEN rebuild — client gets fresh data
        await this._invalidateCart(userId);
        const cart = await this.getCart(userId);
        return cart;
    }

    /**
     * Update cart item quantity
     */
    async updateItemQuantity(userId, itemId, quantity) {
        const item = await cartRepository.findItemById(itemId);
        if (!item) throw new ApiError(404, 'Cart item not found');
        if (item.userId !== userId) throw new ApiError(403, 'Forbidden');

        if (quantity <= 0) {
            await cartRepository.deleteItem(itemId);
        } else {
            await cartRepository.updateItem(itemId, { quantity });
        }

        await this._invalidateCart(userId);
        return this.getCart(userId);
    }

    /**
     * Remove item from cart
     */
    async removeItemFromCart(userId, itemId) {
        const item = await cartRepository.findItemById(itemId);
        if (!item) throw new ApiError(404, 'Cart item not found');
        if (item.userId !== userId) throw new ApiError(403, 'Forbidden');

        await cartRepository.deleteItem(itemId);
        await this._invalidateCart(userId);
        return this.getCart(userId);
    }

    /**
     * Clear entire cart
     */
    async clearCart(userId) {
        await Promise.all([
            cartRepository.clearCart(userId),
            cartRepository.clearCoupon(userId),
            this._invalidateCart(userId),
        ]);
        return { message: 'Cart cleared' };
    }

    /**
     * Apply a coupon to the cart
     */
    async applyCoupon(userId, code) {
        const coupon = await couponRepository.findByCode(code.toUpperCase());
        if (!coupon) throw new ApiError(400, 'Invalid or expired coupon code');

        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            throw new ApiError(400, 'Coupon is not active at this time');
        }
        if (coupon.usageLimit && coupon.totalUsed >= coupon.usageLimit) {
            throw new ApiError(400, 'Coupon usage limit reached');
        }

        const [userUsageCount, { totals, restaurant }] = await Promise.all([
            couponRepository.getUsageCount(userId, coupon.id),
            this.getCart(userId),
        ]);

        if (userUsageCount >= coupon.usageLimitPerUser) {
            throw new ApiError(400, 'You have already used this coupon');
        }
        if (totals.subtotal === 0) {
            throw new ApiError(400, 'Cannot apply coupon to an empty cart');
        }
        if (coupon.applicableRestaurantId && coupon.applicableRestaurantId !== restaurant?.id) {
            throw new ApiError(400, 'This coupon is not applicable for this restaurant');
        }
        if (Number(totals.subtotal) < Number(coupon.minimumOrderAmount)) {
            throw new ApiError(400, `Minimum order of ${coupon.minimumOrderAmount} required for this coupon`);
        }

        await cartRepository.updateActiveCoupon(userId, coupon.id);
        await this._invalidateCart(userId);
        return this.getCart(userId);
    }

    /**
     * Validate cart before checkout
     */
    async validateCart(userId) {
        const cart = await this.getCart(userId);
        const issues = [];

        if (cart.items.length === 0) return { valid: false, issues: ['Cart is empty'] };

        const restaurant = cart.items[0].menuItem.restaurant;
        if (!restaurant.isOpen) issues.push(`Restaurant "${restaurant.name}" is currently closed`);
        if (Number(cart.totals.subtotal) < Number(restaurant.minimumOrderAmount)) {
            issues.push(`Minimum order amount of ${restaurant.minimumOrderAmount} not met`);
        }

        // Parallel availability re-check for all items
        const currentItems = await Promise.all(
            cart.items.map((item) => menuRepository.findByIdForCart(item.menuItemId))
        );

        cart.items.forEach((item, i) => {
            const current = currentItems[i];
            if (!current || !current.isAvailable) {
                issues.push(`Item "${item.menuItem.name}" is no longer available`);
                return;
            }
            const oldPrice = Number(item.priceAtAddition || item.menuItem.price);
            const newPrice = Number(current.price);
            if (Math.abs(newPrice - oldPrice) / oldPrice > 0.1) {
                issues.push(`Price for "${item.menuItem.name}" has changed from ${oldPrice} to ${newPrice}`);
            }
        });

        return { valid: issues.length === 0, issues };
    }

    // ─── Private Helpers ────────────────────────────────────────

    async _buildCartFromDB(userId) {
        const { cartItems, activeCoupon } = await cartRepository.findByUserIdWithCoupon(userId);

        if (cartItems.length === 0) {
            return {
                items: [],
                restaurant: null,
                totals: { subtotal: 0, deliveryFee: 0, tax: 0, discount: 0, total: 0 },
                appliedCoupon: null,
            };
        }

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
            appliedCoupon: activeCoupon
                ? { id: activeCoupon.id, code: activeCoupon.code, description: activeCoupon.description }
                : null,
        };
    }

    /**
     * Calculate cart totals
     */
    calculateTotals(items, restaurant, coupon) {
        let subtotal = 0;
        items.forEach((item) => {
            subtotal += Number(item.priceAtAddition || item.menuItem.price) * item.quantity;
        });

        const deliveryFee = Number(restaurant.deliveryFee);
        const tax = subtotal * 0.05;
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
            if (coupon.type !== 'FREE_DELIVERY' && discount > subtotal + tax) {
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
