// =============================================================
// src/middlewares/errorHandler.js — Global Error Handler
// =============================================================

const { Prisma } = require('@prisma/client');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const errorHandler = (err, req, res, _next) => {
  let error = err;

  // ── Convert Prisma Errors ────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const field = err.meta?.target?.join(', ') || 'field';
        error = ApiError.conflict(`A record with the same ${field} already exists.`);
        break;
      }
      case 'P2025':
        // Record not found
        error = ApiError.notFound('The requested record was not found.');
        break;
      case 'P2003':
        // Foreign key constraint
        console.error('DEBUG: P2003 Foreign key constraint failed:', JSON.stringify(err.meta, null, 2));
        const failedField = err.meta?.field_name || 'some field';
        error = ApiError.badRequest(`Invalid reference: related record does not exist on [${failedField}].`);
        break;
      case 'P2014':
        error = ApiError.badRequest('Invalid relation data provided.');
        break;
      default:
        error = ApiError.internal(`Database operation failed: [${err.code}] ${err.message}`);
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    error = ApiError.badRequest(`Invalid data provided to database: ${err.message}`);
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    error = ApiError.internal('Database connection failed.');
  }

  // ── Handle JWT Errors ────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token.');
  }

  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token has expired.');
  }

  // ── Handle Multer Errors ─────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('File size exceeds the allowed limit.');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = ApiError.badRequest('Unexpected file field.');
  }

  // ── Cast to ApiError if needed ───────────────────────────
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  // ── Log the error ────────────────────────────────────────
  if (error.statusCode >= 500) {
    logger.error({
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });
  } else {
    logger.warn({
      message: error.message,
      statusCode: error.statusCode,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // ── Send Response ────────────────────────────────────────
  return res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

module.exports = errorHandler;
