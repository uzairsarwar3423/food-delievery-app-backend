const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');

jest.setTimeout(30000);

describe('Search System Integration Tests', () => {
    let testUser;
    let accessToken;
    let testRestaurant;
    let testMenuItem;

    beforeAll(async () => {
        // 1. Create a test user
        testUser = await prisma.user.create({
            data: {
                email: `search_user_${Date.now()}@example.com`,
                passwordHash: 'hashed_password',
                firstName: 'Search',
                lastName: 'Test',
                role: 'CUSTOMER',
                isActive: true,
                isEmailVerified: true
            }
        });

        // 2. Login to get token
        const loginResp = await request(app).post('/api/v1/auth/login').send({
            identifier: testUser.email,
            password: 'Password123!', // This might fail if we didn't hash it properly in DB, but we can mock or just use raw user
        });
        // Actually, easier to use a helper or just manually create a token if we can, 
        // but let's just stick to the pattern used in other tests.
        // Wait, the user.test.js used /api/v1/auth/register then manual update.

        // Let's just mock the auth or use a real login if the system allows.
        // Re-doing the auth part like in user.test.js
        const testUserRaw = {
            email: `search_user_${Date.now()}@example.com`,
            phone: `+92322${Math.floor(Math.random() * 9000000 + 1000000)}`,
            password: 'Password123!',
            firstName: 'Search',
            lastName: 'Tester'
        };
        const regResp = await request(app).post('/api/v1/auth/register').send(testUserRaw);
        testUser = regResp.body.data.user;
        await prisma.user.update({ where: { id: testUser.id }, data: { isEmailVerified: true } });
        const logResp = await request(app).post('/api/v1/auth/login').send({
            identifier: testUserRaw.email,
            password: testUserRaw.password
        });
        accessToken = logResp.body.data.accessToken;

        // 3. Create a test restaurant
        testRestaurant = await prisma.restaurant.create({
            data: {
                name: 'Pizza Palace',
                slug: `pizza-palace-${Date.now()}`,
                description: 'Best pizza in town with cheesy crust',
                cuisineTypes: ['Italian', 'Pizza'],
                status: 'APPROVED',
                phone: '12345678',
                email: 'pizza@palace.com',
                addressLine1: 'Main St',
                city: 'Lahore',
                state: 'Punjab',
                postalCode: '54000',
                latitude: 31.5204,
                longitude: 74.3587,
                ownerId: testUser.id,
                averageRating: 4.5,
                isOpen: true
            }
        });

        // 4. Create a test menu item
        // Need a category first
        const category = await prisma.category.findFirst() || await prisma.category.create({
            data: { name: 'Fast Food', slug: 'fast-food' }
        });

        testMenuItem = await prisma.menuItem.create({
            data: {
                restaurantId: testRestaurant.id,
                categoryId: category.id,
                name: 'Pepperoni Feast',
                slug: 'pepperoni-feast',
                description: 'Double pepperoni with extra mozzarella',
                price: 1200,
                isAvailable: true,
                tags: ['Popular', 'Spicy']
            }
        });
    });

    afterAll(async () => {
        await prisma.searchHistory.deleteMany({ where: { userId: testUser.id } });
        await prisma.menuItem.delete({ where: { id: testMenuItem.id } });
        await prisma.restaurant.delete({ where: { id: testRestaurant.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
        await disconnectRedis();
        await prisma.$disconnect();
    });

    describe('GET /api/v1/search/restaurants', () => {
        it('should search restaurants by name', async () => {
            const res = await request(app).get('/api/v1/search/restaurants?q=Pizza');
            expect(res.status).toBe(200);
            expect(res.body.data.restaurants.length).toBeGreaterThan(0);
            expect(res.body.data.restaurants[0].name).toContain('Pizza');
        });

        it('should filter restaurants by rating', async () => {
            const filters = JSON.stringify({ minRating: 4.0 });
            const res = await request(app).get(`/api/v1/search/restaurants?filters=${filters}`);
            expect(res.status).toBe(200);
            expect(res.body.data.restaurants.every(r => r.averageRating >= 4.0)).toBe(true);
        });
    });

    describe('GET /api/v1/search/menu-items', () => {
        it('should search menu items by name', async () => {
            const res = await request(app).get('/api/v1/search/menu-items?q=Pepperoni');
            expect(res.status).toBe(200);
            expect(res.body.data.menuItems.length).toBeGreaterThan(0);
            expect(res.body.data.menuItems[0].name).toContain('Pepperoni');
        });
    });

    describe('GET /api/v1/search/suggestions', () => {
        it('should return search suggestions', async () => {
            const res = await request(app).get('/api/v1/search/suggestions?q=Piz');
            expect(res.status).toBe(200);
            expect(res.body.data.suggestions).toBeDefined();
            expect(res.body.data.suggestions.length).toBeGreaterThan(0);
        });
    });

    describe('History & Popular', () => {
        it('should save search history', async () => {
            const res = await request(app)
                .post('/api/v1/search/save')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ searchTerm: 'Burgers' });

            expect(res.status).toBe(201);
        });

        it('should get search history', async () => {
            const res = await request(app)
                .get('/api/v1/search/history')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.searchHistory).toContain('Burgers');
        });

        it('should get popular searches', async () => {
            const res = await request(app).get('/api/v1/search/popular');
            expect(res.status).toBe(200);
            expect(res.body.data.popularSearches).toBeDefined();
            expect(res.body.data.trending).toBeDefined();
        });
    });
});
