/**
 * src/services/location.service.js
 * Location-based calculations and geo utilities
 */

const logger = require('../config/logger');

class LocationService {
  /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 Latitude of point 1
     * @param {number} lon1 Longitude of point 1
     * @param {number} lat2 Latitude of point 2
     * @param {number} lon2 Longitude of point 2
     * @returns {number} Distance in kilometers
     */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) {return null;}

    const R = 6371; // Earth's radius in km
    const dLat = this._toRadians(lat2 - lat1);
    const dLon = this._toRadians(lon2 - lon1);

    const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._toRadians(lat1)) *
            Math.cos(this._toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return parseFloat(distance.toFixed(2));
  }

  /**
     * Check if a point is within a given radius
     * @param {number} lat1 Latitude of point 1
     * @param {number} lon1 Longitude of point 1
     * @param {number} lat2 Latitude of point 2
     * @param {number} lon2 Longitude of point 2
     * @param {number} radius Radius in km
     * @returns {boolean}
     */
  isWithinRadius(lat1, lon1, lat2, lon2, radius) {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    if (distance === null) {return false;}
    return distance <= radius;
  }

  /**
     * Convert degrees to radians
     * @param {number} degrees
     * @returns {number}
     */
  _toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
     * Sort array of objects by distance from reference point
     * @param {Array} items Objects with latitude and longitude properties
     * @param {number} refLat Reference latitude
     * @param {number} refLon Reference longitude
     * @returns {Array} Sorted items with 'distance' property added
     */
  sortByDistance(items, refLat, refLon) {
    if (!refLat || !refLon) {return items;}

    return items
      .map((item) => {
        const itemLat = parseFloat(item.latitude);
        const itemLon = parseFloat(item.longitude);
        const distance = this.calculateDistance(refLat, refLon, itemLat, itemLon);
        return { ...item, distance };
      })
      .sort((a, b) => a.distance - b.distance);
  }
}

module.exports = new LocationService();
