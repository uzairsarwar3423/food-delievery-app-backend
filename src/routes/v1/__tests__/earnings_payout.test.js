require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');
const { shutdownQueue } = require('../../../jobs/orderQueue');
const { ORDER_STATUS } = require('../../../utils/constants');
const { subDays, startOfDay } = require('date-fns');

jest.setTimeout(60000);

describe('Earnings & Payout System Integration Tests', () => {
    let riderToken = '';
    let riderId = '';
    let userId = '';
    let testPayoutId = '';
    let timestamp = Date.now();

    beforeAll(async () => {
        await prisma.$connect();

        // 1. Register a NEW rider for isolation
        const res = await request(app)
            .post('/api/v1/rider/auth/register')
            .send({
                email: `rider_${timestamp}@delivery.pk`,
                password: 'RiderPassword123!',
                phone: `+92311${Math.floor(Math.random() * 9000000 + 1000000)}`,
                fullName: 'Earnings Tester',
                dateOfBirth: '1990-01-01',
                cnicNumber: `12345-${timestamp % 10000000}-1`,
                vehicleType: 'MOTORCYCLE',
                vehicleNumber: `TEST-${timestamp % 1000}`,
                licenseNumber: `L-${timestamp}`,
                licenseExpiry: '2030-01-01',
            });

        if (res.status !== 201) {
            console.error('--- REGISTRATION FAILED ---', res.status, res.body);
            throw new Error('Registration failed');
        }

        riderToken = res.body.data.tokens.accessToken;
        userId = res.body.data.user.id;
        riderId = res.body.data.deliveryPerson.id;

        // 2. Set bank details
        await prisma.deliveryPerson.update({
            where: { id: riderId },
            data: {
                bankName: 'Test Bank',
                bankAccountNumber: 'PK00TEST' + timestamp,
                bankAccountName: 'Test Rider Account'
            }
        });

        // 3. Seed Delivered Orders
        const restaurant = await prisma.restaurant.findFirst();
        const address = await prisma.userAddress.findFirst();

        const createTestOrder = (date, earnings, tip, bonus) => {
            return prisma.order.create({
                data: {
                    orderNumber: `TORD-${Math.random().toString(36).substring(7).toUpperCase()}`,
                    customerId: userId,
                    deliveryPersonId: riderId,
                    restaurantId: restaurant.id,
                    deliveryAddressId: address.id,
                    status: ORDER_STATUS.DELIVERED,
                    subtotal: 500,
                    deliveryFee: 100,
                    totalAmount: 600,
                    riderEarnings: earnings,
                    tipAmount: tip,
                    bonusAmount: bonus,
                    deliveredAt: date,
                    createdAt: date
                }
            });
        };

        const today = new Date();
        const yesterday = subDays(today, 1);
        const lastWeek = subDays(today, 8);

        await createTestOrder(today, 150, 50, 10);
        await createTestOrder(today, 150, 0, 0);
        await createTestOrder(yesterday, 200, 100, 20);
        await createTestOrder(lastWeek, 100, 0, 0);
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await disconnectRedis();
        await shutdownQueue().catch(() => { });
    });

    describe('Earnings Endpoints', () => {
        it('should return earnings summary (today: 360)', async () => {
            const res = await request(app)
                .get('/api/v1/rider/earnings/summary')
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.today).toBe(360);
        });

        it('should return today detailed earnings (2 deliveries)', async () => {
            const res = await request(app)
                .get('/api/v1/rider/earnings/today')
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.deliveries).toBe(2);
            expect(res.body.data.totalEarnings).toBe(360);
        });

        it('should return trip history', async () => {
            const res = await request(app)
                .get('/api/v1/rider/earnings/trips')
                .set('Authorization', `Bearer ${riderToken}`);

            if (res.status !== 200) console.log('DEBUG Trip History Fail:', res.status, JSON.stringify(res.body));
            expect(res.status).toBe(200);
            expect(res.body.data.trips.length).toBeGreaterThanOrEqual(4);
        });
    });

    describe('Payout Endpoints', () => {
        it('should return pending payout balance', async () => {
            const res = await request(app)
                .get('/api/v1/rider/payouts/pending')
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.pendingAmount).toBeGreaterThanOrEqual(780);
        });

        it('should fail payout request if amount < 1000', async () => {
            const res = await request(app)
                .post('/api/v1/rider/payouts/request')
                .set('Authorization', `Bearer ${riderToken}`)
                .send({ amount: 500 });

            // Using express-validator usually returns 422 for validation failures in this project
            expect(res.status).toBe(422);
        });

        it('should succeed request payout after reaching threshold', async () => {
            // Seeding more
            const restaurant = await prisma.restaurant.findFirst();
            const address = await prisma.userAddress.findFirst();
            await prisma.order.create({
                data: {
                    orderNumber: `TOPUP-${Date.now()}`,
                    customerId: userId,
                    deliveryPersonId: riderId,
                    restaurantId: restaurant.id,
                    deliveryAddressId: address.id,
                    status: ORDER_STATUS.DELIVERED,
                    subtotal: 500,
                    deliveryFee: 100,
                    totalAmount: 600,
                    riderEarnings: 1000,
                    deliveredAt: new Date(),
                    createdAt: new Date()
                }
            });

            const res = await request(app)
                .post('/api/v1/rider/payouts/request')
                .set('Authorization', `Bearer ${riderToken}`)
                .send({ amount: 1200 });

            if (res.status !== 201) console.error('PAYOUT_FAIL_DEBUG:', JSON.stringify(res.body));
            expect(res.status).toBe(201);
            testPayoutId = res.body.data.id;
        });

        it('should return payout history', async () => {
            const res = await request(app)
                .get('/api/v1/rider/payouts/history')
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.payouts.length).toBeGreaterThan(0);
        });

        it('should return payout details', async () => {
            const res = await request(app)
                .get(`/api/v1/rider/payouts/${testPayoutId}`)
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(testPayoutId);
        });
    });
});
