// =============================================================
// src/middlewares/logger.middleware.js — Request Logger
// =============================================================

const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Attach a unique request ID and log each incoming request / response
 */
const requestLogger = (req, res, next) => {
  // Assign unique ID to each request for tracing
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);

  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || null,
    };

    if (res.statusCode >= 500) {
      logger.error(logData);
    } else if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.http(logData);
    }
  });

  next();
};

module.exports = { requestLogger };
