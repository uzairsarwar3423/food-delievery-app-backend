/**
 * src/services/cache.service.js
 * Redis Cache Service Wrapper
 */

const redisConfig = require('../config/redis');
const logger = require('../config/logger');

class CacheService {
  /**
     * Get value from cache
     * @param {string} key
     * @returns {Promise<any>}
     */
  async get(key) {
    return redisConfig.cacheGet(key);
  }

  /**
     * Set value in cache
     * @param {string} key
     * @param {any} value
     * @param {number} ttl In seconds
     */
  async set(key, value, ttl = redisConfig.DEFAULT_TTL) {
    return redisConfig.cacheSet(key, value, ttl);
  }

  /**
     * Delete exact keys from cache (no wildcards)
     * @param {...string} keys
     */
  async del(...keys) {
    return redisConfig.cacheDel(...keys);
  }

  /**
     * Delete all keys matching a glob pattern (uses SCAN — non-blocking)
     * @param {string} pattern e.g. "restaurant:details:abc-123:*"
     */
  async delPattern(pattern) {
    return redisConfig.cacheDelPattern(pattern);
  }

  /**
     * Generate cache key for a restaurants search/listing query.
     * Params are sorted so that the same query in different insertion order
     * always resolves to the same key.
     */
  generateRestaurantKey(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join(':');
    return `restaurants:search:${sortedParams}`;
  }

  /**
     * Generate cache key for a restaurant's menu.
     */
  generateMenuKey(restaurantId, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join(':');
    return `menu:${restaurantId}:${sortedParams}`;
  }

  /**
     * Clear all restaurant listing/search related cache.
     * Also clears individual restaurant detail keys.
     */
  async clearRestaurantCache(restaurantId = null) {
    // Always clear listing/search cache
    await this.delPattern('restaurants:*');

    // If we know the specific restaurant, target it precisely
    if (restaurantId) {
      await this.delPattern(`restaurant:details:${restaurantId}*`);
    } else {
      // Full wipe — used when listing-wide data changes (e.g. approval status)
      await this.delPattern('restaurant:details:*');
    }

    logger.info('Restaurant cache cleared');
  }

  /**
     * Clear all menu related cache for a restaurant (or all restaurants).
     */
  async clearMenuCache(restaurantId) {
    if (restaurantId) {
      await this.delPattern(`menu:${restaurantId}:*`);
    } else {
      await this.delPattern('menu:*');
    }
    logger.info('Menu cache cleared');
  }

  /**
     * Clear all category related cache.
     */
  async clearCategoryCache() {
    await this.delPattern('categories:*');
    logger.info('Category cache cleared');
  }
}

module.exports = new CacheService();
