/**
 * src/websocket/events/notification.events.js
 * Notification event emitters for Socket.io
 */

const { getIO } = require('../io');
const logger = require('../../config/logger');

/**
 * Emit new notification to a specific user
 * @param {string} userId - User to receive the notification
 * @param {object} notification - Notification data
 */
const emitNotificationNew = (userId, notification) => {
    const io = getIO();
    if (!io) return;

    // Send to private user-specific room
    io.to(`user:${userId}`).emit('notification:new', {
        id: notification.id,
        title: notification.title,
        body: notification.body || notification.message,
        type: notification.type,
        createdAt: notification.createdAt
    });

    logger.debug(`📡 Emitted notification:new to user:${userId}`);
};

/**
 * Emit global notification (admin to all)
 * @param {object} notification - Global notification data
 */
const emitNotificationAll = (notification) => {
    const io = getIO();
    if (!io) return;

    // Broadcast to everyone connected
    io.emit('notification:new', {
        id: notification.id,
        title: notification.title,
        body: notification.body || notification.message,
        type: 'SYSTEM',
        createdAt: new Date()
    });

    logger.debug(`📡 Emitted system notification to ALL users`);
};

module.exports = {
    emitNotificationNew,
    emitNotificationAll
};
