// =============================================================
// src/utils/helpers.js — Utility Helper Functions
// =============================================================

const crypto = require('crypto');

/**
 * Haversine formula to calculate distance between two lat/lon points
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

const toRad = (value) => (value * Math.PI) / 180;

/**
 * Generate a unique order number: ORD-YYYYMMDD-XXXXXX
 */
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${dateStr}-${random}`;
};

/**
 * Generate a secure random OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

/**
 * Generate a secure token
 */
const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

/**
 * Create slug from string
 */
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

/**
 * Paginate helper — returns skip/take for Prisma
 */
const getPaginationParams = (page, limit) => {
  let p = parseInt(page, 10);
  let l = parseInt(limit, 10);

  const safePage = isNaN(p) || p < 1 ? 1 : p;
  const safeLimit = isNaN(l) || l < 1 ? 10 : (l > 100 ? 100 : l);

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
};

/**
 * Build pagination meta for API responses
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

/**
 * Pick only specified keys from an object
 */
const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});

/**
 * Omit specified keys from an object
 */
const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

/**
 * Delay for n milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Format price to 2 decimal places
 */
const formatPrice = (amount) => parseFloat(parseFloat(amount).toFixed(2));

/**
 * Check if a restaurant is currently open
 */
const isRestaurantOpen = (openingTime, closingTime, isOpen) => {
  if (!isOpen) {
    return false;
  }
  if (!openingTime || !closingTime) {
    return true;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;

  // Handle past midnight closing (e.g., 02:00)
  if (closeMinutes < openMinutes) {
    closeMinutes += 24 * 60;
    const adjustedCurrent =
      currentMinutes < openMinutes ? currentMinutes + 24 * 60 : currentMinutes;
    return adjustedCurrent >= openMinutes && adjustedCurrent < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};

module.exports = {
  calculateDistance,
  generateOrderNumber,
  generateOTP,
  generateToken,
  slugify,
  getPaginationParams,
  buildPaginationMeta,
  pick,
  omit,
  sleep,
  formatPrice,
  isRestaurantOpen,
};
