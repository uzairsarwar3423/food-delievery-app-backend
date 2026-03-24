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
    // Handle express-validator (Array)
    if (Array.isArray(validations)) {
      await Promise.all(validations.map((validation) => validation.run(req)));

      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }

      const formattedErrors = errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      }));

      return next(ApiError.unprocessable('Validation failed', formattedErrors));
    }

    // Handle Joi (Object with validate method)
    if (validations && typeof validations.validate === 'undefined' && (validations.body || validations.query || validations.params)) {
      // This is the structure in review.validator.js: { body: Joi.object(), ... }
      const schemaKeys = Object.keys(validations);
      for (const key of schemaKeys) {
        if (req[key]) {
          const { error, value } = validations[key].validate(req[key], { abortEarly: false });
          if (error) {
            const formattedErrors = error.details.map((details) => ({
              field: details.path.join('.'),
              message: details.message,
              value: details.context.value,
            }));
            return next(ApiError.unprocessable('Validation failed', formattedErrors));
          }
          // Update req[key] with validated value (handles defaults/conversions)
          req[key] = value;
        }
      }
      return next();
    }

    return next();
  };
};

module.exports = validate;
