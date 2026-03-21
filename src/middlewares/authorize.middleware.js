// =============================================================
// src/middlewares/authorize.middleware.js — Role-Based Access
// =============================================================

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authorize middleware — checks if the authenticated user has the required roles
 * @param {...string} roles - Array of allowed roles
 */
const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. Your role (${req.user.role}) is not authorized to access this resource.`,
      );
    }

    next();
  });
};

module.exports = authorize;
