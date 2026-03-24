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
const riderRoutes = require('./v1/rider.routes');
const deliveryRoutes = require('./v1/delivery.routes');
const earningsRoutes = require('./v1/earnings.routes');
const payoutRoutes = require('./v1/payout.routes');
const searchRoutes = require('./v1/search.routes');
const reviewRoutes = require('./v1/review.routes');
const notificationRoutes = require('./v1/notification.routes');
const adminRoutes = require('./v1/admin.routes.js');


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
router.use('/v1/rider/earnings', earningsRoutes);
router.use('/v1/rider/payouts', payoutRoutes);
router.use('/v1/rider', riderRoutes);
router.use('/v1/rider', deliveryRoutes);
router.use('/v1/search', searchRoutes);
router.use('/v1', reviewRoutes);
router.use('/v1', menuRoutes);
router.use('/v1/notifications', notificationRoutes);
router.use('/v1/admin', adminRoutes);


module.exports = router;
