/**
 * src/routes/v1/cart.routes.js
 * Cart Routes
 */

const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cart.controller');
const cartValidator = require('../../validators/cart.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');

// All cart routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/cart
 * @desc    Fetch all cart items for user
 * @access  Private
 */
router.get('/', cartController.getCart);

/**
 * @route   POST /api/v1/cart/items
 * @desc    Add item to cart
 * @access  Private
 */
router.post('/items',
    validate(cartValidator.addItem),
    cartController.addItem
);

/**
 * @route   PUT /api/v1/cart/items/:itemId
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/items/:itemId',
    validate(cartValidator.updateItem),
    cartController.updateItem
);

/**
 * @route   DELETE /api/v1/cart/items/:itemId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/items/:itemId',
    validate(cartValidator.removeItem),
    cartController.removeItem
);

/**
 * @route   DELETE /api/v1/cart/clear
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/clear', cartController.clearCart);

/**
 * @route   POST /api/v1/cart/coupon
 * @desc    Apply coupon to cart
 * @access  Private
 */
router.post('/coupon',
    validate(cartValidator.applyCoupon),
    cartController.applyCoupon
);

/**
 * @route   POST /api/v1/cart/validate
 * @desc    Validate cart before checkout
 * @access  Private
 */
router.post('/validate', cartController.validateCart);

module.exports = router;
