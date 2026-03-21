// =============================================================
// src/middlewares/auth.middleware.js — JWT Authentication
// =============================================================

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { cacheGet, cacheSet } = require('../config/redis');

/**
 * Verify JWT access token and attach user to req.user
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  // 1. Extract token from headers or cookies
  const token =
        req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.split(' ')[1]
          : req.cookies?.accessToken;

  if (!token) {
    throw ApiError.unauthorized('Access token is required');
  }

  // 2. Check Blacklist
  const isBlacklisted = await cacheGet(`bl:access:${token}`);
  if (isBlacklisted) {
    throw ApiError.unauthorized('Token is no longer valid. Please log in again.');
  }

  // 3. Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 4. Try cache first
  const cacheKey = `user:${decoded.id}`;
  let user = await cacheGet(cacheKey);

  if (!user) {
    // 5. Fetch from DB
    user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    // Cache for 5 minutes
    await cacheSet(cacheKey, user, 300);
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been suspended');
  }

  req.user = user;
  next();
});

/**
 * Role-based authorization
 */
const authorize = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. Required role: ${roles.join(' or ')}`,
      );
    }
    next();
  });

/**
 * Optional authentication (does not throw if no token)
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    const token =
            req.headers.authorization?.startsWith('Bearer ')
              ? req.headers.authorization.split(' ')[1]
              : req.cookies?.accessToken;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const cacheKey = `user:${decoded.id}`;
      let user = await cacheGet(cacheKey);

      if (!user) {
        user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, role: true, isActive: true },
        });
        if (user) {
          await cacheSet(cacheKey, user, 300);
        }
      }

      if (user?.isActive) {
        req.user = user;
      }
    }
  } catch (_err) {
    // Ignore errors — user remains undefined
  }
  next();
});

module.exports = { authenticate, authorize, optionalAuth };
