// =============================================================
// src/server.js — HTTP + Socket.io Server Entry Point
// =============================================================

const dotenv = require('dotenv');
const result = dotenv.config();
if (result.error) {
  // We don't exit because env vars might be passed directly by Docker
  console.warn('⚠️  .env file not found. Relying on system environment variables.');
}

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
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080,http://localhost:8081').split(','),
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

    // Warm up the connection pool — fires 3 lightweight queries in parallel
    // so the pool is ready before the first real API request arrives.
    // Without this, the first request suffers a 3-4s cold-start penalty.
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.$queryRaw`SELECT 1`,
      prisma.$queryRaw`SELECT 1`,
    ]);
    logger.info('✅ DB connection pool warmed up');

    // Test Redis connection — non-fatal: server starts even if Redis is unreachable.
    // Cache helpers already have try/catch and silently no-op on errors.
    try {
      await getRedisClient().ping();
      logger.info('✅ Redis connected');
    } catch (redisErr) {
      logger.warn('⚠️  Redis unavailable at startup — continuing without cache. Error:', redisErr.message);
    }

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
  logger.info(`\\n${signal} received. Shutting down gracefully...`);

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
  // Suppress Redis reconnection errors — ioredis emits these as unhandled rejections
  // after max retries are exhausted. The cache helpers handle errors gracefully so
  // these don't require a server restart.
  if (reason && reason.code === 'EAI_AGAIN' && reason.syscall === 'getaddrinfo') {
    logger.warn('Redis DNS resolution failed (EAI_AGAIN) — cache disabled until Redis recovers.');
    return;
  }
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();

module.exports = { server, io };
