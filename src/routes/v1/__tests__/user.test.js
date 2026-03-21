// =============================================================
// src/routes/v1/__tests__/user.test.js — User Integration Tests
// =============================================================

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { getRedisClient, disconnectRedis } = require('../../../config/redis');

jest.setTimeout(30000);

describe('User Management Integration Tests', () => {
  const testUser = {
    email: `user_${Date.now()}@example.com`,
    phone: `+92311${Math.floor(Math.random() * 9000000 + 1000000)}`,
    password: 'Password123!',
    firstName: 'User',
    lastName: 'Test',
  };

  let accessToken = '';
  let testRestaurantId = '';
  let testAddressId = '';

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Create User
    const registerResp = await request(app).post('/api/v1/auth/register').send(testUser);
    testUser.id = registerResp.body.data.user.id;

    // 2. Verify Email (manually in DB for speed)
    await prisma.user.update({
      where: { id: testUser.id },
      data: { isEmailVerified: true },
    });

    // 3. Login to get token
    const loginResp = await request(app).post('/api/v1/auth/login').send({
      identifier: testUser.email,
      password: testUser.password,
    });
    accessToken = loginResp.body.data.accessToken;

    // 4. Create a test restaurant for favorites
    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'Test Restaurant',
        slug: `test-restaurant-${Date.now()}`,
        phone: '1234567890',
        email: 'test@restaurant.com',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        latitude: 0,
        longitude: 0,
        ownerId: testUser.id,
      },
    });
    testRestaurantId = restaurant.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.favorite.deleteMany({ where: { userId: testUser.id } }).catch(() => { });
    await prisma.userAddress.deleteMany({ where: { userId: testUser.id } }).catch(() => { });
    await prisma.restaurant.delete({ where: { id: testRestaurantId } }).catch(() => { });
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => { });
    await prisma.$disconnect();
    await disconnectRedis();
  });

  // ─────────────────────────────────────────────────────────────
  // PROFILE TESTS
  // ─────────────────────────────────────────────────────────────
  describe('User Profile', () => {
    it('should fetch user profile', async () => {
      const res = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      if (res.status !== 200) {console.log('DEBUG:', res.body);}
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated', lastName: 'Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Updated');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ADDRESS TESTS
  // ─────────────────────────────────────────────────────────────
  describe('User Addresses', () => {
    it('should add a new address', async () => {
      const res = await request(app)
        .post('/api/v1/users/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          label: 'Home',
          fullAddress: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          postalCode: '54000',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.label).toBe('Home');
      testAddressId = res.body.data.id;
    });

    it('should get all addresses', async () => {
      const res = await request(app)
        .get('/api/v1/users/addresses')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should update an address', async () => {
      const res = await request(app)
        .put(`/api/v1/users/addresses/${testAddressId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ label: 'Work' });

      expect(res.status).toBe(200);
      expect(res.body.data.label).toBe('Work');
    });

    it('should delete an address', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/addresses/${testAddressId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FAVORITE TESTS
  // ─────────────────────────────────────────────────────────────
  describe('User Favorites', () => {
    it('should toggle a restaurant as favorite', async () => {
      const res = await request(app)
        .post(`/api/v1/users/favorites/${testRestaurantId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isFavorite).toBe(true);
    });

    it('should fetch favorites', async () => {
      const res = await request(app)
        .get('/api/v1/users/favorites')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].restaurantId).toBe(testRestaurantId);
    });

    it('should remove restaurant from favorites on second toggle', async () => {
      const res = await request(app)
        .post(`/api/v1/users/favorites/${testRestaurantId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isFavorite).toBe(false);
    });
  });
});
