// src/utils/jwt.js
// JWT token generation, verification, and refresh utilities

const jwt = require('jsonwebtoken');

const JWT_SECRET = () => process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET;

/**
 * Generate a short-lived access token
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });

/**
 * Generate a long-lived refresh token
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

/**
 * Verify access token — throws on invalid/expired
 */
const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET());

/**
 * Verify refresh token — throws on invalid/expired
 */
const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET());

/**
 * Decode a token without verification (for inspection only)
 */
const decodeToken = (token) => jwt.decode(token);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
