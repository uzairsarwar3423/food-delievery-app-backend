// =============================================================
// src/config/database.js — Prisma Client Singleton
// =============================================================

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log slow queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 100) {
      logger.warn(`Slow Query (${e.duration}ms): ${e.query}`);
    }
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

// Graceful shutdown
const disconnectDB = async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
};

module.exports = { prisma, disconnectDB };
