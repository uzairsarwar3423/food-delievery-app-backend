// =============================================================
// src/services/auth.service.js — Auth Business Logic
// =============================================================

const { prisma } = require('../config/database');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/encryption');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  decodeToken,
} = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { REDIS_KEYS, TOKEN_TTL, ROLES } = require('../utils/constants');
const crypto = require('crypto');

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Service to handle all core authentication logic
 */
class AuthService {
  /**
     * Register a new user
     */
  async register(userData) {
    const { email, phone, password, firstName, lastName, role } = userData;

    // 1. Check if email exists
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw ApiError.conflict('Email already registered');
      }
    }

    // 2. Check if phone exists
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        throw ApiError.conflict('Phone number already registered');
      }
    }

    // 3. Hash password
    const passwordHash = password ? await hashPassword(password) : null;

    // 4. Create user
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        role: role || 'CUSTOMER',
        isEmailVerified: false,
        isActive: true,
        provider: password ? 'LOCAL' : 'PHONE',
      },
    });

    // 5. Generate Verification Token (only if email is provided)
    if (email) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await cacheSet(
        `${REDIS_KEYS.EMAIL_VERIFY_TOKEN}${verificationToken}`,
        user.id,
        TOKEN_TTL.EMAIL_VERIFY,
      );

      // 6. Send Verification Email (Async)
      sendVerificationEmail(user.email, `${user.firstName || 'User'} ${user.lastName || ''}`, verificationToken);
    }

    // 7. Generate JWT Tokens
    const tokens = await this.generateAuthTokens(user.id);

    return { user: this.excludePassword(user), tokens };
  }

  /**
     * Login user
     */
  async login(identifier, password) {
    // 1. Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // 2. Verify password
    const isPasswordMatch = await comparePassword(password, user.passwordHash);
    if (!isPasswordMatch) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    return await this.processLogin(user);
  }

  /**
   * Login or Register with Email OTP (OTP already verified).
   * Since the OTP proves ownership of the email, we mark it as verified.
   */
  async loginWithEmail(email) {
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Auto-register new customer — no password needed
      user = await prisma.user.create({
        data: {
          email,
          role: ROLES.CUSTOMER,
          provider: 'EMAIL_OTP',
          isActive: true,
          isEmailVerified: true, // OTP proves ownership
        },
      });
    } else if (!user.isEmailVerified) {
      // Mark existing unverified account as verified
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });
    }

    return await this.processLogin(user);
  }

  /**
   * Login or Register with Google
   */
  async loginWithGoogle(idToken) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: avatarUrl } = payload;

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email },
          ],
        },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            googleId,
            email,
            firstName,
            lastName,
            avatarUrl,
            role: ROLES.CUSTOMER,
            provider: 'GOOGLE',
            isEmailVerified: true,
            isActive: true,
          },
        });
      } else if (!user.googleId) {
        // Link existing account to Google
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            provider: 'GOOGLE',
            avatarUrl: user.avatarUrl || avatarUrl,
          },
        });
      }

      return await this.processLogin(user);
    } catch (error) {
      throw ApiError.unauthorized('Google authentication failed');
    }
  }

  /**
   * Helper: Common login processing logic
   */
  async processLogin(user) {
    // 1. Check if active
    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been suspended');
    }

    // 2. Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 3. Generate Tokens
    const tokens = await this.generateAuthTokens(user.id);

    return {
      user: this.excludePassword(user),
      tokens,
    };
  }

  /**
   * Helper: Remove sensitive data from user object
   */
  excludePassword(user) {
    const { passwordHash, refreshToken, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  }

  /**
     * Logout user
     */
  async logout(accessToken, refreshToken) {
    // 1. Blacklist Access Token (if it exists)
    if (accessToken) {
      try {
        const decoded = decodeToken(accessToken);
        // Store in Redis with TTL matching token's expiry
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;
        if (ttl > 0) {
          await cacheSet(`${REDIS_KEYS.ACCESS_TOKEN_BLACKLIST}${accessToken}`, 'blacklisted', ttl);
        }
      } catch (err) {
        // Invalid token, ignore
      }
    }

    // 2. Remove Refresh Token from database
    if (refreshToken) {
      await prisma.user.updateMany({
        where: { refreshToken },
        data: { refreshToken: null },
      });
    }

    return true;
  }

  /**
     * Verify Email
     */
  async verifyEmail(token) {
    const userId = await cacheGet(`${REDIS_KEYS.EMAIL_VERIFY_TOKEN}${token}`);
    if (!userId) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });

    await cacheDel(`${REDIS_KEYS.EMAIL_VERIFY_TOKEN}${token}`);
    return true;
  }

  /**
     * Resend Verification Email
     */
  async resendVerification(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, isEmailVerified: true },
    });

    if (!user) {
      // Success response for security (don't reveal if email exists)
      return true;
    }

    if (user.isEmailVerified) {
      throw ApiError.badRequest('Email is already verified');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await cacheSet(
      `${REDIS_KEYS.EMAIL_VERIFY_TOKEN}${verificationToken}`,
      user.id,
      TOKEN_TTL.EMAIL_VERIFY,
    );

    sendVerificationEmail(email, `${user.firstName} ${user.lastName}`, verificationToken);
    return true;
  }

  /**
     * Forgot Password
     */
  async forgotPassword(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!user) {return true;} // Security

    const resetToken = crypto.randomBytes(32).toString('hex');
    await cacheSet(
      `${REDIS_KEYS.PASSWORD_RESET_TOKEN}${resetToken}`,
      user.id,
      TOKEN_TTL.PASSWORD_RESET,
    );

    sendPasswordResetEmail(email, `${user.firstName} ${user.lastName}`, resetToken);
    return true;
  }

  /**
     * Reset Password
     */
  async resetPassword(token, newPassword) {
    const userId = await cacheGet(`${REDIS_KEYS.PASSWORD_RESET_TOKEN}${token}`);
    if (!userId) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshToken: null, // Invalidate existing sessions
      },
    });

    await cacheDel(`${REDIS_KEYS.PASSWORD_RESET_TOKEN}${token}`);

    // Clear user cache
    await cacheDel(`${REDIS_KEYS.USER_CACHE}${userId}`);

    return true;
  }

  /**
     * Refresh Tokens
     */
  async refreshToken(token) {
    if (!token) {throw ApiError.unauthorized('Refresh token is required');}

    try {
      const decoded = verifyRefreshToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, refreshToken: true, isActive: true },
      });

      if (!user || user.refreshToken !== token || !user.isActive) {
        throw ApiError.unauthorized('Invalid or expired refresh token');
      }

      return await this.generateAuthTokens(user.id);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  /**
     * Change Password
     */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Verification failed: Current password incorrect');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshToken: null,
      },
    });

    return true;
  }

  /**
     * Helper: Generate both Access and Refresh tokens and save refresh token to DB
     */
  async generateAuthTokens(userId) {
    const accessToken = generateAccessToken({ id: userId });
    const refreshToken = generateRefreshToken({ id: userId });

    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
