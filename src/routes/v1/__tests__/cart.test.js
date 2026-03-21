/**
 * src/routes/v1/__tests__/cart.test.js
 * Cart System Integration Tests
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');

jest.setTimeout(60000);

describe('Cart System Integration Tests', () => {
    let accessToken = '';
    let customerUser = null;
    let restaurant1 = null;
    let restaurant2 = null;
    let menuItem1 = null; // From restaurant 1
    let menuItem2 = null; // From restaurant 1
    let menuItem3 = null; // From restaurant 2
    let testCartItemId = '';

    beforeAll(async () => {
        await prisma.$connect();

        // 1. Get/Create Customer
        customerUser = await prisma.user.findUnique({ where: { email: 'ali.khan@gmail.com' } });
        if (!customerUser) {
            // Create if doesn't exist (though seed should have it)
            const bcrypt = require('bcryptjs');
            customerUser = await prisma.user.create({
                data: {
                    email: 'ali.khan@gmail.com',
                    phone: '03001111001',
                    passwordHash: await bcrypt.hash('Customer@123', 12),
                    firstName: 'Ali',
                    lastName: 'Khan',
                    role: 'CUSTOMER',
                }
            });
        }

        // 2. Login to get token
        const loginResp = await request(app).post('/api/v1/auth/login').send({
            identifier: 'ali.khan@gmail.com',
            password: 'Customer@123',
        });
        accessToken = loginResp.body.data.accessToken;

        // 3. Find Restaurants and Menu Items
        restaurant1 = await prisma.restaurant.findUnique({ where: { slug: 'the-burger-lab' } });
        restaurant2 = await prisma.restaurant.findUnique({ where: { slug: 'pizza-palace' } });

        menuItem1 = await prisma.menuItem.findFirst({ where: { restaurantId: restaurant1.id, name: 'Classic Smash Burger' } });
        menuItem2 = await prisma.menuItem.findFirst({ where: { restaurantId: restaurant1.id, name: 'Double Bacon Blast' } });
        menuItem3 = await prisma.menuItem.findFirst({ where: { restaurantId: restaurant2.id, name: 'Margherita Classic' } });

        // 4. Ensure a clean cart
        await prisma.cartItem.deleteMany({ where: { userId: customerUser.id } });
        await prisma.user.update({ where: { id: customerUser.id }, data: { activeCouponId: null } });
    });

    afterAll(async () => {
        await prisma.cartItem.deleteMany({ where: { userId: customerUser.id } });
        await prisma.user.update({ where: { id: customerUser.id }, data: { activeCouponId: null } });
        await prisma.$disconnect();
        await disconnectRedis();
    });

    // ─────────────────────────────────────────────────────────────
    // CART OPERATIONS
    // ─────────────────────────────────────────────────────────────

    describe('GET /api/v1/cart', () => {
        it('should return empty cart initially', async () => {
            const res = await request(app)
                .get('/api/v1/cart')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
            expect(res.body.data.totals.subtotal).toBe(0);
        });
    });

    describe('POST /api/v1/cart/items', () => {
        it('should add an item to the cart', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    menuItemId: menuItem1.id,
                    quantity: 2,
                    customizations: { extraCheese: true }
                });

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].menuItemId).toBe(menuItem1.id);
            expect(res.body.data.items[0].quantity).toBe(2);
            expect(Number(res.body.data.totals.subtotal)).toBe(Number(menuItem1.price) * 2);

            testCartItemId = res.body.data.items[0].id;
        });

        it('should add another item from the same restaurant', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    menuItemId: menuItem2.id,
                    quantity: 1
                });

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(2);
            const expectedSubtotal = (Number(menuItem1.price) * 2) + Number(menuItem2.price);
            expect(Number(res.body.data.totals.subtotal)).toBe(expectedSubtotal);
        });

        it('should prevent adding item from a different restaurant', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    menuItemId: menuItem3.id,
                    quantity: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('another restaurant');
        });

        it('should clear cart and add item if clearIfDifferentRestaurant is true', async () => {
            const res = await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    menuItemId: menuItem3.id,
                    quantity: 1,
                    clearIfDifferentRestaurant: true
                });

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].menuItemId).toBe(menuItem3.id);
            expect(Number(res.body.data.totals.subtotal)).toBe(Number(menuItem3.price));

            // Update the testCartItemId for subsequent tests
            testCartItemId = res.body.data.items[0].id;
        });
    });

    describe('PUT /api/v1/cart/items/:itemId', () => {
        it('should update item quantity', async () => {
            const res = await request(app)
                .put(`/api/v1/cart/items/${testCartItemId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ quantity: 3 });

            expect(res.status).toBe(200);
            expect(res.body.data.items[0].quantity).toBe(3);
            expect(Number(res.body.data.totals.subtotal)).toBe(Number(menuItem3.price) * 3);
        });
    });

    describe('POST /api/v1/cart/coupon', () => {
        it('should apply a valid coupon', async () => {
            // Margherita Classic is ~680. 3 items = 2040.
            // WELCOME20 is 20% off. 20% of 2040 is 408.
            // Max discount is 200. So discount should be 200.

            const res = await request(app)
                .post('/api/v1/cart/coupon')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: 'WELCOME20' });

            expect(res.status).toBe(200);
            expect(res.body.data.appliedCoupon.code).toBe('WELCOME20');
            expect(res.body.data.totals.discount).toBe(200);
        });

        it('should fail with invalid coupon code', async () => {
            const res = await request(app)
                .post('/api/v1/cart/coupon')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: 'INVALID_CODE' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/v1/cart/validate', () => {
        it('should validate current cart', async () => {
            const res = await request(app)
                .post('/api/v1/cart/validate')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.valid).toBe(true);
            expect(res.body.data.issues).toHaveLength(0);
        });
    });

    describe('DELETE /api/v1/cart/items/:itemId', () => {
        it('should remove an item from the cart', async () => {
            const res = await request(app)
                .delete(`/api/v1/cart/items/${testCartItemId}`)
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
        });
    });

    describe('DELETE /api/v1/cart/clear', () => {
        it('should clear the entire cart', async () => {
            // First add something
            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ menuItemId: menuItem1.id, quantity: 1 });

            const res = await request(app)
                .delete('/api/v1/cart/clear')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);

            const checkRes = await request(app)
                .get('/api/v1/cart')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(checkRes.body.data.items).toHaveLength(0);
        });
    });
});
