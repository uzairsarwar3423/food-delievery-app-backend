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
     * Delete keys from cache
     * @param {...string} keys
     */
  async del(...keys) {
    return redisConfig.cacheDel(...keys);
  }

  /**
     * Delete keys by pattern
     * @param {string} pattern
     */
  async delPattern(pattern) {
    return redisConfig.cacheDelPattern(pattern);
  }

  /**
     * Generate cache key for restaurants search
     */
  generateRestaurantKey(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join(':');
    return `restaurants:search:${sortedParams}`;
  }

  /**
     * Generate cache key for menu
     */
  generateMenuKey(restaurantId, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join(':');
    return `menu:${restaurantId}:${sortedParams}`;
  }

  /**
     * Clear all restaurant related cache
     */
  async clearRestaurantCache() {
    await this.delPattern('restaurants:*');
    logger.info('Restaurant cache cleared');
  }

  /**
     * Clear all menu related cache for a restaurant
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
     * Clear all category related cache
     */
  async clearCategoryCache() {
    await this.delPattern('categories:*');
    logger.info('Category cache cleared');
  }
}

module.exports = new CacheService();
