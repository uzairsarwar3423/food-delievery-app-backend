// =============================================================
// src/config/redis.js — Redis Client Setup
// =============================================================

const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

const createRedisClient = () => {
  const redisOptions = {
    retryStrategy: (times) => {
      // Cap retries — after 20 attempts (~37 seconds of backoff) give up
      if (times > 20) {
        logger.error('Redis: maximum reconnection attempts reached. Stopping retries.');
        return null; // returning null stops retrying; ioredis will emit an error
      }
      const delay = Math.min(times * 100, 3000);
      logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms...`);
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
  client.on('error', (err) => {
    // Log but DO NOT re-throw — an unhandled 'error' event crashes the process.
    // Cache helpers already no-op on errors so the app continues without caching.
    logger.error('Redis error:', err.message || err);
  });
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

/**
 * Delete all keys matching a glob pattern using non-blocking SCAN.
 * Never use KEYS in production — it blocks the Redis event loop for O(N).
 */
const cacheDelPattern = async (pattern) => {
  try {
    const client = getRedisClient();
    let cursor = '0';
    let totalDeleted = 0;

    do {
      // SCAN returns [nextCursor, [key1, key2, ...]]
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        // Pipeline the DEL commands for efficiency
        const pipeline = client.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    if (totalDeleted > 0) {
      logger.debug(`Deleted ${totalDeleted} cache key(s) matching "${pattern}"`);
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
