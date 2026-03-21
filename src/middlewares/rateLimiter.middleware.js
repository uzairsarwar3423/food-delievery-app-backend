// =============================================================
// src/middlewares/rateLimiter.middleware.js — Rate Limiting
// =============================================================

const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

// Generic API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
  },
  handler: (req, res, _next, options) => {
    logger.warn(`Rate limit hit: ${req.ip} — ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

// OTP limiter — 5 requests per 10 minutes
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many OTP requests. Please wait 10 minutes.',
  },
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
