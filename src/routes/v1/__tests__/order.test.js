/**
 * src/routes/v1/__tests__/order.test.js
 * Order System Integration Tests
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');
const { ORDER_STATUS } = require('../../../utils/constants');

jest.setTimeout(60000);

describe('Order System Integration Tests', () => {
    let customerToken = '';
    let ownerToken = '';
    let riderToken = '';

    let customerId = '';
    let restaurantId = '';
    let menuItemId = '';
    let addressId = '';

    let testOrderId = '';
    let testOrderNumber = '';

    beforeAll(async () => {
        await prisma.$connect();

        // 1. Get tokens for different roles
        const login = async (email, password) => {
            const res = await request(app).post('/api/v1/auth/login').send({ identifier: email, password });
            return res.body.data.accessToken;
        };

        customerToken = await login('ali.khan@gmail.com', 'Customer@123');
        ownerToken = await login('owner1@burgerlab.pk', 'Owner@123456');
        riderToken = await login('rider1@delivery.pk', 'Rider@123456');

        // 2. Fetch necessary IDs
        const user = await prisma.user.findUnique({ where: { email: 'ali.khan@gmail.com' }, include: { addresses: true } });
        customerId = user.id;

        if (!user.addresses || user.addresses.length === 0) {
            const newAddr = await prisma.userAddress.create({
                data: {
                    userId: customerId,
                    label: 'Home',
                    addressLine1: 'Test Address 123',
                    city: 'Lahore',
                    state: 'Punjab',
                    postalCode: '54000',
                    latitude: 31.5204,
                    longitude: 74.3587,
                    isDefault: true,
                }
            });
            addressId = newAddr.id;
        } else {
            addressId = user.addresses[0].id;
        }

        const restaurant = await prisma.restaurant.findUnique({ where: { slug: 'the-burger-lab' } });
        restaurantId = restaurant.id;

        const menuItem = await prisma.menuItem.findFirst({ where: { restaurantId } });
        menuItemId = menuItem.id;

        // 3. Clean up existing orders/cart for this user
        await prisma.cartItem.deleteMany({ where: { userId: customerId } });
        // Keep orders but we'll focus on the new ones
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await disconnectRedis();
    });

    // ─────────────────────────────────────────────────────────────
    // ORDER PLACEMENT
    // ─────────────────────────────────────────────────────────────

    describe('Order Creation Flow', () => {
        it('should fail to place order with empty cart', async () => {
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    deliveryAddressId: addressId,
                    paymentMethod: 'CASH'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('cart is empty');
        });

        it('should place an order successfully after adding items to cart', async () => {
            // Add items to cart first
            await request(app)
                .post('/api/v1/cart/items')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ menuItemId, quantity: 2 });

            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    deliveryAddressId: addressId,
                    paymentMethod: 'CASH',
                    specialInstructions: 'No onions please'
                });

            if (res.status !== 201) console.log('DEBUG Order Creation Fail:', JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(201);
            expect(res.body.data.orderNumber).toBeDefined();
            expect(res.body.data.status).toBe('PENDING');
            expect(res.body.data.orderItems).toHaveLength(1);

            testOrderId = res.body.data.id;
            testOrderNumber = res.body.data.orderNumber;

            // Verify cart is cleared
            const cartRes = await request(app).get('/api/v1/cart').set('Authorization', `Bearer ${customerToken}`);
            expect(cartRes.body.data.items).toHaveLength(0);
        });
    });

    // ─────────────────────────────────────────────────────────────
    // ORDER RETRIEVAL
    // ─────────────────────────────────────────────────────────────

    describe('Order Retrieval', () => {
        it('should fetch order history', async () => {
            const res = await request(app)
                .get('/api/v1/orders')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('should fetch order details', async () => {
            const res = await request(app)
                .get(`/api/v1/orders/${testOrderId}`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.orderNumber).toBe(testOrderNumber);
            expect(res.body.data.restaurant).toBeDefined();
            expect(res.body.data.customer).toBeDefined();
        });

        it('should fetch active orders', async () => {
            const res = await request(app)
                .get('/api/v1/orders/active')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.some(o => o.id === testOrderId)).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────
    // STATUS MANAGEMENT
    // ─────────────────────────────────────────────────────────────

    describe('Status Management & State Machine', () => {
        it('should allow customer to cancel a PENDING order', async () => {
            const res = await request(app)
                .put(`/api/v1/orders/${testOrderId}/cancel`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ reason: 'Changed my mind' });

            if (res.status !== 200) console.log('DEBUG Cancel Fail:', JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('CANCELLED');
        });

        it('should place a new order for status transition testing', async () => {
            await request(app).post('/api/v1/cart/items').set('Authorization', `Bearer ${customerToken}`).send({ menuItemId, quantity: 1 });
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ deliveryAddressId: addressId, paymentMethod: 'CASH' });

            testOrderId = res.body.data.id;
        });

        it('should allow restaurant owner to CONFIRM the order', async () => {
            const res = await request(app)
                .put(`/api/v1/orders/${testOrderId}/status`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'CONFIRMED' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('CONFIRMED');
        });

        it('should prevent customer from status changes', async () => {
            const res = await request(app)
                .put(`/api/v1/orders/${testOrderId}/status`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ status: 'PREPARING' });

            expect(res.status).toBe(403);
        });

        it('should follow lifecycle: CONFIRMED -> PREPARING -> READY_FOR_PICKUP', async () => {
            // 1. Preparing
            await request(app)
                .put(`/api/v1/orders/${testOrderId}/status`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'PREPARING' });

            // 2. Ready
            const res = await request(app)
                .put(`/api/v1/orders/${testOrderId}/status`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ status: 'READY_FOR_PICKUP' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('READY_FOR_PICKUP');
        });

        it('should follow delivery flow: READY -> OUT_FOR_DELIVERY -> DELIVERED (as Rider)', async () => {
            // 1. Out for delivery
            await request(app)
                .put(`/api/v1/orders/${testOrderId}/status`)
                .set('Authorization', `Bearer ${riderToken}`)
                .send({ status: 'OUT_FOR_DELIVERY' });

            // 2. Delivered
            const res = await request(app)
                .put(`/api/v1/orders/${testOrderId}/status`)
                .set('Authorization', `Bearer ${riderToken}`)
                .send({ status: 'DELIVERED' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('DELIVERED');
        });
    });

    // ─────────────────────────────────────────────────────────────
    // REVIEWS & STATS
    // ─────────────────────────────────────────────────────────────

    describe('Reviews, Stats & Reordering', () => {
        it('should post a review for the delivered order', async () => {
            const res = await request(app)
                .post(`/api/v1/restaurants/${restaurantId}/reviews`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId: testOrderId,
                    rating: 5,
                    foodRating: 5,
                    serviceRating: 4,
                    comment: 'Delicious burger!'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.restaurantRating).toBe(5);
        });

        it('should fetch user statistics', async () => {
            const res = await request(app)
                .get('/api/v1/orders/stats')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.totalOrders).toBeGreaterThan(0);
            expect(res.body.data.completed).toBeGreaterThan(0);
        });

        it('should allow reordering', async () => {
            const res = await request(app)
                .post(`/api/v1/orders/${testOrderId}/reorder`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items.length).toBeGreaterThan(0);
            expect(res.body.data.restaurant.id).toBe(restaurantId);
        });
    });
});
