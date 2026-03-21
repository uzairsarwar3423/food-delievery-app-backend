/**
 * src/controllers/cart.controller.js
 * Cart Endpoints Controller
 */

const cartService = require('../services/cart.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Fetch all cart items for user with calculations
 */
const getCart = asyncHandler(async (req, res) => {
    const cart = await cartService.getCart(req.user.id);
    return ApiResponse.success(res, cart, 'Cart fetched successfully');
});

/**
 * Add an item to the cart
 */
const addItem = asyncHandler(async (req, res) => {
    const cart = await cartService.addItemToCart(req.user.id, req.body);
    return ApiResponse.success(res, cart, 'Item added to cart');
});

/**
 * Update quantity of a cart item
 */
const updateItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateItemQuantity(req.user.id, itemId, quantity);
    return ApiResponse.success(res, cart, 'Cart updated');
});

/**
 * Remove a specific item from the cart
 */
const removeItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const cart = await cartService.removeItemFromCart(req.user.id, itemId);
    return ApiResponse.success(res, cart, 'Item removed from cart');
});

/**
 * Clear all items from the cart
 */
const clearCart = asyncHandler(async (req, res) => {
    const result = await cartService.clearCart(req.user.id);
    return ApiResponse.success(res, null, result.message);
});

/**
 * Apply a coupon code to the current cart
 */
const applyCoupon = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const cart = await cartService.applyCoupon(req.user.id, code);
    return ApiResponse.success(res, cart, 'Coupon applied successfully');
});

/**
 * Validate cart items and prices before checkout
 */
const validateCart = asyncHandler(async (req, res) => {
    const validation = await cartService.validateCart(req.user.id);
    return ApiResponse.success(res, validation, 'Cart validation result');
});

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    applyCoupon,
    validateCart,
};
