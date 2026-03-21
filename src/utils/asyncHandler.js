// =============================================================
// src/utils/asyncHandler.js — Async Route Handler Wrapper
// =============================================================

/**
 * Wraps an async route handler to automatically catch errors
 * and pass them to Express's next() error handler.
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
