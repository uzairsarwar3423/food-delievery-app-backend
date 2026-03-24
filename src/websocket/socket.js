/**
 * src/websocket/socket.js
 * Socket.io Singleton for App-Wide Access
 */

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { prisma } = require('../config/database');

const { setIO, getIO, emitToRoom } = require('./io');

// Handlers
const registerOrderHandlers = require('./handlers/order.handler');
const registerRiderHandlers = require('./handlers/rider.handler');

/**
 * Initialize Socket.io with the HTTP server
 */
const initSocket = (socketIoInstance) => {
    setIO(socketIoInstance);
    const io = getIO();

    // ─── Socket.io Middleware for JWT Auth ──────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, email: true, role: true, isActive: true }
            });

            if (!user || !user.isActive) {
                return next(new Error('Authentication error: Invalid or inactive user'));
            }

            // Attach user to socket
            socket.user = user;
            next();
        } catch (err) {
            logger.error(`🔌 WS Auth Error: ${err.message}`);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        const { id: userId, role } = socket.user;
        logger.info(`🔌 Socket connected: ${socket.id} (User: ${userId}, Role: ${role})`);

        // 1. Join user-specific room for private notifications
        socket.join(`user:${userId}`);
        logger.debug(`👤 User ${userId} joined room user:${userId}`);

        // 2. Join role-specific rooms
        socket.join(`role:${role.toLowerCase()}`);
        logger.debug(`👥 User ${userId} joined room role:${role.toLowerCase()}`);

        // Register feature-specific handlers
        registerOrderHandlers(socket, io);
        registerRiderHandlers(socket, io);

        socket.on('disconnect', () => {
            logger.info(`🔌 Socket disconnected: ${socket.id} (User: ${userId})`);
        });
    });

    return io;
};

module.exports = {
    initSocket,
    getIO,
    emitToRoom
};
