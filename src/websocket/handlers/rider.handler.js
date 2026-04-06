/**
 * src/websocket/handlers/rider.handler.js
 * Handle rider-specific websocket events
 */

const logger = require('../../config/logger');
const deliveryService = require('../../services/delivery.service');
const locationEvents = require('../events/location.events');

/**
 * Register rider websocket events
 * @param {import('socket.io').Socket} socket 
 * @param {import('socket.io').Server} io 
 */
const registerRiderHandlers = (socket, io) => {

    // Only allow riders to send location updates
    if (socket.user.role !== 'DELIVERY_PERSON') return;

    // Handle rider going online
    socket.on('rider:online', async () => {
        logger.info(`🏍️ Rider ${socket.user.id} is now ONLINE`);
        locationEvents.emitRiderOnline(socket.user.id);
        socket.emit('rider:online_status', { online: true });
    });

    // Handle rider going offline
    socket.on('rider:offline', async () => {
        logger.info(`🏍️ Rider ${socket.user.id} is now OFFLINE`);
        locationEvents.emitRiderOffline(socket.user.id);
        socket.emit('rider:online_status', { online: false });
    });

    // Real-time location update from rider app
    socket.on('rider:location_update', async (data) => {
        const { latitude, longitude, accuracy, speed, heading } = data;
        const riderId = socket.user.id;

        if (latitude === undefined || longitude === undefined) {
            return socket.emit('error', { message: 'Incomplete location data' });
        }

        try {
            // 1. Update in DB/Cache via service
            const updatedRider = await deliveryService.updateLocation(riderId, {
                latitude, longitude, accuracy, speed, heading
            });

            // 2. Broadcast to all subscribers (customers tracking their orders)
            // The locationEvents will handle broadcasting to the correct rooms
            locationEvents.emitRiderLocationUpdate(riderId, {
                latitude,
                longitude,
                accuracy,
                speed,
                heading,
                updatedAt: new Date()
            });

            logger.debug(`📍 Location updated for rider ${riderId}: ${latitude}, ${longitude}`);
        } catch (error) {
            logger.error(`❌ WS Location update failed for rider ${riderId}: ${error.message}`);
            socket.emit('error', { message: 'Failed to update location' });
        }
    });
};

module.exports = registerRiderHandlers;
