/**
 * src/websocket/events/location.events.js
 * Location event emitters for Socket.io
 */

const { getIO } = require('../io');
const logger = require('../../config/logger');

/**
 * Emit rider location update to subscribers
 * Usually to the customer tracking the order
 * @param {string} riderId 
 * @param {object} locationData 
 */
const emitRiderLocationUpdate = (riderId, locationData) => {
    const io = getIO();
    if (!io) return;

    // Emit to room: rider:{riderId} 
    // This allows customers tracking orders with this rider to see their movement
    io.to(`rider:${riderId}`).emit('rider:location_update', {
        riderId,
        ...locationData
    });

    // Also emit to order-specific rooms if we know which order the rider is currently on
    // But typically track_order:orderId is what's used.
    // Let's also emit to order-specific tracking if we have orderId in locationData
    if (locationData.orderId) {
        io.to(`order:${locationData.orderId}`).emit('rider:location_update', {
            riderId,
            ...locationData
        });
    }

    logger.debug(`📡 Emitted rider:location_update to rider:${riderId}`);
};

/**
 * Emit rider online status
 * @param {string} riderId 
 */
const emitRiderOnline = (riderId) => {
    const io = getIO();
    if (!io) return;

    // Notify dispatch system (role:admin)
    io.to('role:admin').emit('rider:online', { riderId });
    logger.debug(`📡 Emitted rider:online for rider:${riderId}`);
};

/**
 * Emit rider offline status
 * @param {string} riderId 
 */
const emitRiderOffline = (riderId) => {
    const io = getIO();
    if (!io) return;

    // Notify dispatch system (role:admin)
    io.to('role:admin').emit('rider:offline', { riderId });
    logger.debug(`📡 Emitted rider:offline for rider:${riderId}`);
};

module.exports = {
    emitRiderLocationUpdate,
    emitRiderOnline,
    emitRiderOffline
};
