// =============================================================
// src/config/database.js — Prisma Client Singleton (Optimized)
// =============================================================

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const isDev = process.env.NODE_ENV === 'development';

const prisma = new PrismaClient({
  // Only emit query events in dev — in prod this adds overhead
  log: isDev
    ? [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
      // Slow-query detection only — not every query
      { emit: 'event', level: 'query' },
    ]
    : [
      { emit: 'event', level: 'error' },
    ],
  // Connection pool tuning for Supabase pooler
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Log only truly slow queries (>300ms) so logs stay manageable
if (isDev) {
  prisma.$on('query', (e) => {
    if (e.duration > 300) {
      logger.warn(`🐢 Slow Query (${e.duration}ms): ${e.query.substring(0, 200)}`);
    }
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma error: ', e);
});

// Graceful shutdown
const disconnectDB = async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
};

module.exports = { prisma, disconnectDB };
