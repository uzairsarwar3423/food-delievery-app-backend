// =============================================================
// src/routes/v1/__tests__/delivery.test.js — Delivery System Tests
// =============================================================

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');
const { ORDER_STATUS } = require('../../../utils/constants');

jest.setTimeout(60000);

describe('Delivery System Integration Tests (Day 10)', () => {
    let riderToken = '';
    let riderId = '';
    let testOrderId = '';
    let restaurantId = '';
    let pickupCode = '';
    let customerCode = '';

    beforeAll(async () => {
        await prisma.$connect();

        // 1. Get rider token
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ identifier: 'rider1@delivery.pk', password: 'Rider@123456' });

        if (loginRes.status !== 200) {
            console.error('Rider login failed:', loginRes.body);
        }
        riderToken = loginRes.body.data.accessToken;

        const rider = await prisma.deliveryPerson.findFirst({
            where: { user: { email: 'rider1@delivery.pk' } }
        });
        riderId = rider.id;

        // 2. Setup: Ensure rider is ONLINE and Available and clean any active orders
        await prisma.order.updateMany({
            where: {
                deliveryPersonId: riderId,
                status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] }
            },
            data: { deliveryPersonId: null }
        });

        await prisma.deliveryPerson.update({
            where: { id: riderId },
            data: { status: 'ONLINE', isAvailable: true }
        });

        // 3. Create a test order ready for pickup with short order number
        const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'the-burger-lab' } });
        restaurantId = restaurant.id;

        const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' }, include: { addresses: true } });

        const order = await prisma.order.create({
            data: {
                orderNumber: `ORD-${Math.floor(Math.random() * 1000000)}`,
                customerId: customer.id,
                restaurantId: restaurant.id,
                deliveryAddressId: customer.addresses[0].id,
                status: 'READY_FOR_PICKUP',
                subtotal: 500,
                deliveryFee: 50,
                totalAmount: 550,
            }
        });
        testOrderId = order.id;
    });

    afterAll(async () => {
        // Cleanup test order
        if (testOrderId) {
            await prisma.deliveryIssue.deleteMany({ where: { orderId: testOrderId } });
            await prisma.order.delete({ where: { id: testOrderId } }).catch(() => { });
        }
        await prisma.$disconnect();
        await disconnectRedis();
    });

    describe('1. Available & Acceptance', () => {
        it('should fetch available deliveries near rider', async () => {
            const res = await request(app)
                .get('/api/v1/rider/deliveries/available')
                .set('Authorization', `Bearer ${riderToken}`)
                .query({ latitude: 31.5204, longitude: 74.3587 });

            expect(res.status).toBe(200);
            expect(res.body.data.deliveries).toBeDefined();
            // In case of error, res.body.data might be undefined, so we check res.status first
            if (res.status === 200) {
                expect(res.body.data.deliveries.some(d => d.id === testOrderId)).toBe(true);
            }
        });

        it('should allow rider to accept a delivery', async () => {
            const res = await request(app)
                .post(`/api/v1/rider/deliveries/${testOrderId}/accept`)
                .set('Authorization', `Bearer ${riderToken}`);

            if (res.status !== 200) console.log('Accept fail:', res.body);
            expect(res.status).toBe(200);
            expect(res.body.data.delivery.deliveryPersonId).toBe(riderId);

            pickupCode = res.body.data.delivery.verificationCode;
            expect(pickupCode).toBeDefined();
        });

        it('should prevent rider from accepting another delivery while active', async () => {
            const order2 = await prisma.order.create({
                data: {
                    orderNumber: `EXT-${Math.floor(Math.random() * 1000000)}`,
                    customerId: (await prisma.user.findFirst({ where: { role: 'CUSTOMER' } })).id,
                    restaurantId: restaurantId,
                    deliveryAddressId: (await prisma.userAddress.findFirst()).id,
                    status: 'READY_FOR_PICKUP',
                    subtotal: 500,
                    deliveryFee: 50,
                    totalAmount: 550,
                }
            });

            const res = await request(app)
                .post(`/api/v1/rider/deliveries/${order2.id}/accept`)
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not available|active delivery/);

            await prisma.order.delete({ where: { id: order2.id } });
        });
    });

    describe('2. Delivery Lifecycle', () => {
        it('should record arrival at restaurant', async () => {
            const res = await request(app)
                .put(`/api/v1/rider/deliveries/${testOrderId}/arrive-restaurant`)
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.order.arrivedAtRestaurantAt).toBeDefined();
        });

        it('should pickup the delivery with correct code', async () => {
            const res = await request(app)
                .put(`/api/v1/rider/deliveries/${testOrderId}/pickup`)
                .set('Authorization', `Bearer ${riderToken}`)
                .send({ verificationCode: pickupCode });

            if (res.status !== 200) console.log('Pickup fail:', res.body);
            expect(res.status).toBe(200);
            expect(res.body.data.order.status).toBe('OUT_FOR_DELIVERY');

            customerCode = res.body.data.order.nextVerificationCode;
            expect(customerCode).toBeDefined();
        });

        it('should update real-time location', async () => {
            const res = await request(app)
                .post('/api/v1/rider/location/update')
                .set('Authorization', `Bearer ${riderToken}`)
                .send({
                    latitude: 31.5205,
                    longitude: 74.3505
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Location updated');
        });

        it('should record arrival at customer', async () => {
            const res = await request(app)
                .put(`/api/v1/rider/deliveries/${testOrderId}/arrive-customer`)
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.order.arrivedAtCustomerAt).toBeDefined();
        });

        it('should complete delivery with proof and customer code', async () => {
            const res = await request(app)
                .put(`/api/v1/rider/deliveries/${testOrderId}/complete`)
                .set('Authorization', `Bearer ${riderToken}`)
                .send({
                    verificationCode: customerCode,
                    notes: 'Delivered',
                    proofOfDelivery: 'https://img.com/pod.jpg'
                });

            if (res.status !== 200) console.log('Complete fail:', res.body);
            expect(res.status).toBe(200);
            expect(res.body.data.order.status).toBe('DELIVERED');
        });
    });

    describe('3. History & Issues', () => {
        it('should fetch delivery history', async () => {
            const res = await request(app)
                .get('/api/v1/rider/deliveries/history')
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.deliveries.length).toBeGreaterThan(0);
        });

        it('should report a delivery issue', async () => {
            const res = await request(app)
                .post(`/api/v1/rider/deliveries/${testOrderId}/issue`)
                .set('Authorization', `Bearer ${riderToken}`)
                .send({
                    issueType: 'VEHICLE_BREAKDOWN',
                    description: 'Tire puncture'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.id || res.body.data.issueId).toBeDefined();
        });
    });
});
