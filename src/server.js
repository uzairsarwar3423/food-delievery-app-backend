// =============================================================
// src/server.js — HTTP + Socket.io Server Entry Point
// =============================================================

require('dotenv').config();

const http = require('http');
const { Server: SocketServer } = require('socket.io');
const app = require('./app');
const { prisma, disconnectDB } = require('./config/database');
const { disconnectRedis, getRedisClient } = require('./config/redis');
const logger = require('./config/logger');

const PORT = parseInt(process.env.PORT, 10) || 5000;

const { initSocket } = require('./websocket/socket');

// ─── HTTP Server ──────────────────────────────────────────────
const server = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize unified socket management
initSocket(io);

// Attach io to app so controllers can emit events (Backward Compatibility)
app.set('io', io);

// ─── Boot ─────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Test Redis connection
    await getRedisClient().ping();
    logger.info('✅ Redis connected');

    // Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`🔗 Health: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await disconnectDB();
      await disconnectRedis();
      logger.info('All connections closed. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force close after 30s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();

module.exports = { server, io };
