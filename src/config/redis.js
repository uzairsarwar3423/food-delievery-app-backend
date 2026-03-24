// =============================================================
// src/config/redis.js — Redis Client Setup
// =============================================================

const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

const createRedisClient = () => {
  const redisOptions = {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  };

  const client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisOptions)
    : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB, 10) || 0,
      ...redisOptions,
    });

  client.on('connect', () => logger.info('Redis client connected'));
  client.on('ready', () => logger.info('Redis client ready'));
  client.on('error', (err) => logger.error('Redis error:', err));
  client.on('close', () => logger.warn('Redis connection closed'));
  client.on('reconnecting', () => logger.info('Redis reconnecting...'));

  return client;
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
};

// ─── Cache Helpers ────────────────────────────────────────────

const DEFAULT_TTL = parseInt(process.env.REDIS_TTL, 10) || 3600;

const cacheGet = async (key) => {
  try {
    const data = await getRedisClient().get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Cache GET error for key "${key}":`, err);
    return null;
  }
};

const cacheSet = async (key, value, ttl = DEFAULT_TTL) => {
  try {
    await getRedisClient().setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    logger.error(`Cache SET error for key "${key}":`, err);
  }
};

const cacheDel = async (...keys) => {
  try {
    await getRedisClient().del(...keys);
  } catch (err) {
    logger.error('Cache DEL error:', err);
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    const keys = await getRedisClient().keys(pattern);
    if (keys.length > 0) {
      await getRedisClient().del(...keys);
      logger.debug(`Deleted ${keys.length} cache keys matching "${pattern}"`);
    }
  } catch (err) {
    logger.error(`Cache DEL pattern error for "${pattern}":`, err);
  }
};

module.exports = {
  getRedisClient,
  disconnectRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  DEFAULT_TTL,
};
