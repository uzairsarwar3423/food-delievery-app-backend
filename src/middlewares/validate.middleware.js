// =============================================================
// src/middlewares/validate.middleware.js — Request Validation
// =============================================================

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Higher-order middleware that executes validations and checks for results
 * @param {Array} validations - Array of express-validator chains
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // 1. Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // 2. Collect errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // 3. Format error details
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    // 4. Throw 422 Unprocessable Entity
    // Note: next() is NOT used because ApiError will be caught by global errorHandler
    return next(ApiError.unprocessable('Validation failed', formattedErrors));
  };
};

module.exports = validate;
