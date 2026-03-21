// =============================================================
// src/routes/index.js — Main API Router
// =============================================================

const express = require('express');
const authRoutes = require('./v1/auth.routes');
const userRoutes = require('./v1/user.routes');
const restaurantRoutes = require('./v1/restaurant.routes');
const categoryRoutes = require('./v1/category.routes');
const menuRoutes = require('./v1/menu.routes');
const cartRoutes = require('./v1/cart.routes');
const orderRoutes = require('./v1/order.routes');
const paymentRoutes = require('./v1/payment.routes');

const router = express.Router();

/**
 * Mounting all routes under /api prefix
 */
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/restaurants', restaurantRoutes);
router.use('/v1/categories', categoryRoutes);
router.use('/v1/cart', cartRoutes);
router.use('/v1/orders', orderRoutes);
router.use('/v1/payments', paymentRoutes);
router.use('/v1', menuRoutes);

module.exports = router;
