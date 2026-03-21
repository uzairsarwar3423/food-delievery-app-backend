// =============================================================
// src/modules/auth/__tests__/auth.test.js — Integration Tests
// =============================================================

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { getRedisClient } = require('../../../config/redis');

/**
 * FULL AUTHENTICATION TEST SUITE
 *
 * Tests the 9 core endpoints for Day 2 Auth:
 * 1. Register
 * 2. Login
 * 3. Verify Email
 * 4. Resend Verification
 * 5. Forgot Password
 * 6. Reset Password
 * 7. Refresh Token
 * 8. Logout
 * 9. Change Password
 */

// Increase Jest timeout to 30s for DB/network calls
jest.setTimeout(30000);

describe('Authentication Integration Tests', () => {
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    phone: `+92300${Math.floor(Math.random() * 9000000 + 1000000)}`,
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'CUSTOMER',
  };

  let accessToken = '';
  let refreshToken = '';
  let verificationToken = '';
  let resetToken = '';

  beforeAll(async () => {
    // Ensure DB and Redis are ready
    await prisma.$connect();
    await getRedisClient().ping();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => { });
    }
    await prisma.$disconnect();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. REGISTER
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and generate a verification token', async () => {
      const response = await request(app).post('/api/v1/auth/register').send(testUser);

      if (response.status !== 201) {console.log('DEBUG:', response.body);}
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email);

      testUser.id = response.body.data.user.id;
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail with 422 if email is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'invalid-email' });

      expect(response.status).toBe(422);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should fail with 409 if email already exists', async () => {
      const response = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(response.status).toBe(409);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. VERIFY EMAIL
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/verify-email', () => {
    it('should verify email with valid token from Redis', async () => {
      // The service stores: `ev:<randomToken>` → userId
      // We need to scan Redis for the key storing our userId
      const redis = getRedisClient();
      const keys = await redis.keys('ev:*');

      // Find the token whose value matches our testUser.id
      verificationToken = null;
      for (const key of keys) {
        const val = await redis.get(key);
        // cacheGet stores JSON.stringify, so parse it
        let userId;
        try {
          userId = JSON.parse(val);
        } catch {
          userId = val;
        }
        if (userId === testUser.id) {
          verificationToken = key.replace('ev:', '');
          break;
        }
      }

      expect(verificationToken).toBeTruthy();

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('verified');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. LOGIN
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('should login and return tokens', async () => {
      // Login validator expects `identifier` field (email or phone)
      const response = await request(app).post('/api/v1/auth/login').send({
        identifier: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail with 401 for wrong credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        identifier: testUser.email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. CHANGE PASSWORD
  // ─────────────────────────────────────────────────────────────
  describe('PUT /api/v1/auth/change-password', () => {
    it('should change password for authenticated user', async () => {
      // Validator expects `currentPassword` and `newPassword` (+ confirmPassword)
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      testUser.password = 'NewPassword123!';
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should initiate password reset', async () => {
      // Re-login since change-password invalidates session (refreshToken: null)
      const loginResp = await request(app).post('/api/v1/auth/login').send({
        identifier: testUser.email,
        password: testUser.password,
      });
      accessToken = loginResp.body.data.accessToken;
      refreshToken = loginResp.body.data.refreshToken;

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(response.status).toBe(200);

      // Fetch reset token from Redis: service stores `pr:<token>` → userId
      const redis = getRedisClient();
      const keys = await redis.keys('pr:*');
      resetToken = null;
      for (const key of keys) {
        const val = await redis.get(key);
        let userId;
        try {
          userId = JSON.parse(val);
        } catch {
          userId = val;
        }
        if (userId === testUser.id) {
          resetToken = key.replace('pr:', '');
          break;
        }
      }
      expect(resetToken).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. RESET PASSWORD
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/reset-password/:token', () => {
    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post(`/api/v1/auth/reset-password/${resetToken}`)
        .send({ password: 'Password123!', confirmPassword: 'Password123!' });

      expect(response.status).toBe(200);
      testUser.password = 'Password123!';
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. REFRESH TOKEN
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh-token', () => {
    it('should generate new access token using refresh token', async () => {
      // Re-login since password reset invalidates existing refresh tokens
      const loginResp = await request(app).post('/api/v1/auth/login').send({
        identifier: testUser.email,
        password: testUser.password,
      });
      refreshToken = loginResp.body.data.refreshToken;

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
      accessToken = response.body.data.accessToken;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. LOGOUT
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('should logout and blacklist token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(response.status).toBe(200);

      // Verify token is blacklisted by trying to use it
      // Give Redis a moment to record the blacklist entry
      await new Promise((r) => setTimeout(r, 200));

      const retry = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'AnotherPass123!',
          confirmPassword: 'AnotherPass123!',
        });

      // Should be 401 — token is blacklisted
      expect(retry.status).toBe(401);
      // The auth middleware returns "Token is no longer valid. Please log in again."
      expect(retry.body.message).toContain('no longer valid');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. RESEND VERIFICATION
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/resend-verification', () => {
    it('should trigger email resend', async () => {
      const response = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: testUser.email });

      // Returns 200 or 400 if already verified
      expect([200, 400]).toContain(response.status);
    });
  });
});
