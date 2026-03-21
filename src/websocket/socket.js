/**
 * src/websocket/socket.js
 * Socket.io Singleton for App-Wide Access
 */

const logger = require('../config/logger');

let io = null;

/**
 * Initialize Socket.io with the HTTP server
 */
const initSocket = (socketIoInstance) => {
    io = socketIoInstance;

    io.on('connection', (socket) => {
        logger.info(`🔌 Socket connected: ${socket.id}`);

        // Join user to their private room for notifications
        socket.on('join_user_room', (userId) => {
            socket.join(`user:${userId}`);
            logger.debug(`👤 User ${userId} joined their notification room`);
        });

        // Join restaurant room for orders
        socket.on('join_restaurant_room', (restaurantId) => {
            socket.join(`restaurant:${restaurantId}`);
            logger.debug(`🏪 Restaurant ${restaurantId} joined order room`);
        });

        socket.on('disconnect', () => {
            logger.info(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Get initialized io instance
 */
const getIO = () => {
    if (!io) {
        logger.warn('⚠️  Socket.io accessed before initialization');
    }
    return io;
};

/**
 * Emit event to a specific room
 */
const emitToRoom = (room, event, data) => {
    if (io) {
        io.to(room).emit(event, data);
        logger.debug(`📡 Emitted ${event} to ${room}`);
    }
};

module.exports = {
    initSocket,
    getIO,
    emitToRoom,
};
