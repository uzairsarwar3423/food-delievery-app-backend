/**
 * src/routes/v1/__tests__/restaurant_orders.test.js
 * Test for Restaurant Owner Order Fetching
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');

jest.setTimeout(60000);

describe('Restaurant Owner Order Fetching Tests', () => {
    let ownerToken = '';
    let customerToken = '';
    let restaurantId = '';

    beforeAll(async () => {
        await prisma.$connect();

        const login = async (email, password) => {
            const res = await request(app).post('/api/v1/auth/login').send({ identifier: email, password });
            return res.body.data.accessToken;
        };

        ownerToken = await login('owner1@burgerlab.pk', 'Owner@123456');
        customerToken = await login('ali.khan@gmail.com', 'Customer@123');

        const restaurant = await prisma.restaurant.findUnique({ where: { slug: 'the-burger-lab' } });
        restaurantId = restaurant.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await disconnectRedis();
    });

    it('should allow restaurant owner to fetch their restaurant orders', async () => {
        const res = await request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        if (res.body.data.length > 0) {
            expect(res.body.data[0].orderItems).toBeDefined();
            expect(res.body.data[0].orderItems.length).toBeGreaterThan(0);
            expect(res.body.data[0].orderItems[0].itemName).toBeDefined();
        }
    });

    it('should allow restaurant owner to fetch active orders', async () => {
        const res = await request(app)
            .get('/api/v1/orders/active')
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        if (res.body.data.length > 0) {
            expect(res.body.data[0].orderItems).toBeDefined();
            expect(res.body.data[0].orderItems[0].itemName).toBeDefined();
        }
    });

    it('should still allow customer to fetch their own orders', async () => {
        const res = await request(app)
            .get('/api/v1/orders')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        if (res.body.data.length > 0) {
            expect(res.body.data[0].orderItems).toBeDefined();
            expect(res.body.data[0].orderItems[0].itemName).toBeDefined();
        }
    });
});
