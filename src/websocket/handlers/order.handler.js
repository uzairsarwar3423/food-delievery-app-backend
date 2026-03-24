/**
 * src/websocket/handlers/order.handler.js
 * Handle client-side order-related events
 */

const logger = require('../../config/logger');

/**
 * Register order websocket events
 * @param {import('socket.io').Socket} socket 
 * @param {import('socket.io').Server} io 
 */
const registerOrderHandlers = (socket, io) => {

    // Join a specific order room for real-time updates
    socket.on('order:join', (orderId) => {
        if (!orderId) return;

        socket.join(`order:${orderId}`);
        logger.debug(`📦 User ${socket.user.id} joined room order:${orderId}`);
    });

    // Leave a specific order room
    socket.on('order:leave', (orderId) => {
        if (!orderId) return;

        socket.leave(`order:${orderId}`);
        logger.debug(`📦 User ${socket.user.id} left room order:${orderId}`);
    });
};

module.exports = registerOrderHandlers;
