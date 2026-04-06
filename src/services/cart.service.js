/**
 * src/services/cart.service.js
 * Cart Business Logic — Redis-first, minimal DB writes only
 *
 * Optimization strategy:
 *  - ALL reads served from Redis cache
 *  - DB is only hit for writes (upsert/delete) and cache-miss rebuilds
 *  - Menu items cached 5 min (in menu.repository)
 *  - Full cart cached 2 min under cart:v2:{userId}
 *  - Restaurant lock stored separately under cart:restaurant:{userId}
 *    so conflict check never needs a DB round-trip
 */

const cartRepository = require('../repositories/cart.repository');
const menuRepository = require('../repositories/menu.repository');
const couponRepository = require('../repositories/coupon.repository');
const ApiError = require('../utils/ApiError');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const logger = require('../config/logger');

const CART_TTL = 180;       // 3 min — full serialised cart
const RESTAURANT_TTL = 600; // 10 min — just the locked restaurantId

const cartKey = (userId) => `cart:v2:${userId}`;
const restaurantKey = (userId) => `cart:restaurant:${userId}`;

class CartService {
    // ─── Cache Helpers ──────────────────────────────────────────

    async _getCartFromCache(userId) {
        try { return await cacheGet(cartKey(userId)); } catch { return null; }
    }

    async _setCartCache(userId, cart) {
        try {
            await cacheSet(cartKey(userId), cart, CART_TTL);
            // Also persist restaurant lock key for fast conflict resolution
            if (cart.restaurant) {
                await cacheSet(restaurantKey(userId), cart.restaurant.id, RESTAURANT_TTL);
            }
        } catch { /* non-fatal */ }
    }

    async _invalidateCart(userId) {
        try {
            await Promise.all([
                cacheDel(cartKey(userId)),
                cacheDel(restaurantKey(userId)),
            ]);
        } catch { /* non-fatal */ }
    }

    async _getLockedRestaurantId(userId) {
        try { return await cacheGet(restaurantKey(userId)); } catch { return null; }
    }

    // ─── Public API ─────────────────────────────────────────────

    /**
     * Get cart with totals — Redis-first
     */
    async getCart(userId) {
        const cached = await this._getCartFromCache(userId);
        if (cached) return cached;

        const cart = await this._buildCartFromDB(userId);
        await this._setCartCache(userId, cart);
        return cart;
    }

    /**
     * Add item to cart
     *
     * Round-trips:
     *   1. Redis  — menuItem cache   (1ms | miss→1 DB read cached forever after)
     *   2. Redis  — restaurant lock  (1ms | replaces findByUserId DB call)
     *   3. DB     — upsert write     (~1.3s unavoidable)
     *   4. Redis  — invalidate       (1ms)
     *   5. Redis  — rebuilt cart     (1ms if already rebuilt, else 1 DB read)
     */
    async addItemToCart(userId, itemData) {
        const { menuItemId, quantity, customizations, clearIfDifferentRestaurant } = itemData;

        // 1. Fetch menuItem from Redis cache (or DB on first miss, then cached)
        //    Fetch locked restaurant from Redis in parallel — zero DB calls if both cached
        const [menuItem, lockedRestaurantId] = await Promise.all([
            menuRepository.findByIdForCart(menuItemId),    // Redis-cached
            this._getLockedRestaurantId(userId),            // Redis key
        ]);

        if (!menuItem) throw new ApiError(404, 'Menu item not found');
        if (!menuItem.isAvailable) throw new ApiError(400, 'This item is currently unavailable');

        // 2. Restaurant conflict check — purely from Redis (no DB read)
        if (lockedRestaurantId && lockedRestaurantId !== menuItem.restaurantId) {
            if (!clearIfDifferentRestaurant) {
                // We need restaurant name — get from cart cache
                const cachedCart = await this._getCartFromCache(userId);
                const currentName = cachedCart?.restaurant?.name ?? 'another restaurant';
                throw new ApiError(400, 'Cart already contains items from another restaurant', {
                    type: 'RESTAURANT_CONFLICT',
                    currentRestaurant: currentName,
                });
            }
            // Clear cart + coupon in parallel (2 writes)
            await Promise.all([
                cartRepository.clearCart(userId),
                cartRepository.clearCoupon(userId),
                this._invalidateCart(userId),
            ]);
        }

        // 3. Upsert — single DB write (unavoidable)
        await cartRepository.upsertItem({
            userId,
            menuItemId,
            quantity,
            customizations: customizations || {},
            priceAtAddition: menuItem.discountedPrice ?? menuItem.price,
        });

        // 4. Invalidate stale cart cache
        await cacheDel(cartKey(userId)); // keep restaurant key — it's still valid

        // 5. Rebuild cart and cache it (1 DB read for full cart with coupon)
        const cart = await this._buildCartFromDB(userId);
        await this._setCartCache(userId, cart);
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

        // Parallel: check user usage + get cart (both may be cached)
        const [userUsageCount, currentCart] = await Promise.all([
            couponRepository.getUsageCount(userId, coupon.id),
            this.getCart(userId),
        ]);

        if (userUsageCount >= coupon.usageLimitPerUser) {
            throw new ApiError(400, 'You have already used this coupon');
        }
        if (currentCart.totals.subtotal === 0) {
            throw new ApiError(400, 'Cannot apply coupon to an empty cart');
        }
        if (coupon.applicableRestaurantId && coupon.applicableRestaurantId !== currentCart.restaurant?.id) {
            throw new ApiError(400, 'This coupon is not applicable for this restaurant');
        }
        if (Number(currentCart.totals.subtotal) < Number(coupon.minimumOrderAmount)) {
            throw new ApiError(400, `Minimum order of ${coupon.minimumOrderAmount} required for this coupon`);
        }

        await cartRepository.updateActiveCoupon(userId, coupon.id);
        await cacheDel(cartKey(userId)); // invalidate cart, keep restaurant key
        return this.getCart(userId);
    }

    /**
     * Validate cart before checkout
     */
    async validateCart(userId) {
        const cart = await this.getCart(userId);
        const issues = [];

        if (cart.items.length === 0) return { valid: false, issues: ['Cart is empty'] };

        const restaurant = cart.items[0]?.menuItem?.restaurant ?? cart.restaurant;
        if (restaurant && !restaurant.isOpen) {
            issues.push(`Restaurant "${restaurant.name}" is currently closed`);
        }
        if (restaurant && Number(cart.totals.subtotal) < Number(restaurant.minimumOrderAmount)) {
            issues.push(`Minimum order amount of ${restaurant.minimumOrderAmount} not met`);
        }

        // Parallel availability re-check (each from Redis cache first)
        const currentItems = await Promise.all(
            cart.items.map((item) => menuRepository.findByIdForCart(item.menuItemId))
        );

        cart.items.forEach((item, i) => {
            const current = currentItems[i];
            if (!current || !current.isAvailable) {
                issues.push(`Item "${item.menuItem?.name ?? item.menuItemId}" is no longer available`);
                return;
            }
            const oldPrice = Number(item.priceAtAddition || item.menuItem?.price);
            const newPrice = Number(current.price);
            if (oldPrice > 0 && Math.abs(newPrice - oldPrice) / oldPrice > 0.1) {
                issues.push(`Price for "${item.menuItem?.name}" has changed from ${oldPrice} to ${newPrice}`);
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
