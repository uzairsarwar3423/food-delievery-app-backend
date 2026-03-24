/**
 * src/websocket/io.js
 * Holds the singleton instance of Socket.io
 */

const logger = require('../config/logger');

let io = null;

const setIO = (socketIoInstance) => {
    io = socketIoInstance;
};

const getIO = () => {
    if (!io) {
        logger.warn('⚠️  Socket.io accessed before initialization');
    }
    return io;
};

const emitToRoom = (room, event, data) => {
    if (io) {
        io.to(room).emit(event, data);
        logger.debug(`📡 Emitted ${event} to ${room}`);
    } else {
        logger.warn(`⚠️  Cannot emit ${event} to ${room}: IO not initialized`);
    }
};

module.exports = {
    setIO,
    getIO,
    emitToRoom,
};
