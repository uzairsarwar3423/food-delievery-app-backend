/**
 * src/middlewares/cache.middleware.js
 * Generic Redis Caching Middleware
 */

const cacheService = require('../services/cache.service');
const logger = require('../config/logger');

/**
 * Caching middleware
 * @param {number} ttl Time to live in seconds
 * @param {boolean} useUserSpecific If true, cache will be user-specific
 */
const cacheMiddleware = (ttl = 3600, useUserSpecific = false) => {
  return async (req, res, next) => {
    // Only GET requests should be cached
    if (req.method !== 'GET') {
      return next();
    }

    // Build cache key
    let key = `cache:${req.originalUrl || req.url}`;

    // Add user ID if user-specific
    if (useUserSpecific && req.user && req.user.id) {
      key = `${key}:user:${req.user.id}`;
    }

    try {
      const cachedData = await cacheService.get(key);
      if (cachedData) {
        logger.debug(`Cache hit for key: ${key}`);
        return res.status(200).json(cachedData);
      }

      // Store the original res.json function
      const originalJson = res.json;

      // Wrap the res.json function to save the response to cache
      res.json = function (data) {
        // Save to cache before sending response
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(key, data, ttl).catch((err) => {
            logger.error(`Failed to cache response for ${key}:`, err);
          });
        }

        // Restore original res.json and call it
        res.json = originalJson;
        return res.json(data);
      };

      logger.debug(`Cache miss for key: ${key}`);
      next();
    } catch (err) {
      logger.error('Cache middleware error:', err);
      next();
    }
  };
};

module.exports = cacheMiddleware;
