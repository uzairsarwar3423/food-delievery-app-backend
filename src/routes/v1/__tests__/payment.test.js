/**
 * src/routes/v1/__tests__/payment.test.js
 * Payment System Integration Tests
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');

jest.setTimeout(60000);

describe('Payment System Integration Tests', () => {
    let customerToken = '';
    let riderToken = '';
    let customerId = '';
    let riderId = '';
    let testOrderId = '';
    let testPaymentId = '';
    let verificationCode = '';

    beforeAll(async () => {
        await prisma.$connect();

        const login = async (email, password) => {
            const res = await request(app).post('/api/v1/auth/login').send({ identifier: email, password });
            return res.body.data.accessToken;
        };

        customerToken = await login('ali.khan@gmail.com', 'Customer@123');
        riderToken = await login('rider1@delivery.pk', 'Rider@123456');

        const user = await prisma.user.findUnique({ where: { email: 'ali.khan@gmail.com' }, include: { addresses: true } });
        customerId = user.id;

        if (!user.addresses || user.addresses.length === 0) {
            await prisma.userAddress.create({
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
        }

        const riderUser = await prisma.user.findUnique({ where: { email: 'rider1@delivery.pk' }, include: { deliveryProfile: true } });
        if (!riderUser || !riderUser.deliveryProfile) {
            throw new Error('Rider user or delivery profile not found. Please seed the database.');
        }
        riderId = riderUser.deliveryProfile.id;

        // Create a test order
        const restaurant = await prisma.restaurant.findFirst({ where: { status: 'APPROVED' } });
        if (!restaurant) throw new Error('No approved restaurant found for testing');

        const address = await prisma.userAddress.findFirst({ where: { userId: customerId } });
        if (!address) throw new Error('No address found for test user');

        try {
            const order = await prisma.order.create({
                data: {
                    orderNumber: `TP-${Date.now()}`,
                    customerId: customerId,
                    restaurantId: restaurant.id,
                    deliveryAddressId: address.id,
                    status: 'PENDING',
                    subtotal: 1000,
                    totalAmount: 1100,
                    deliveryFee: 100,
                }
            });
            testOrderId = order.id;
        } catch (error) {
            console.error('Order creation failed:', error);
            throw error;
        }
    });

    afterAll(async () => {
        // Cleanup
        if (testOrderId) {
            await prisma.payment.deleteMany({ where: { orderId: testOrderId } }).catch(e => { });
            await prisma.order.delete({ where: { id: testOrderId } }).catch(e => { });
        }
        await prisma.$disconnect();
        await disconnectRedis();
    });

    describe('Payment Methods', () => {
        it('should fetch available payment methods', async () => {
            const res = await request(app)
                .get('/api/v1/payments/methods/available')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.some(m => m.method === 'cash')).toBe(true);
        });
    });

    describe('Payment Creation & Retrieval', () => {
        it('should create a payment record for COD', async () => {
            const res = await request(app)
                .post('/api/v1/payments/create')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId: testOrderId,
                    paymentMethod: 'CASH'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe('PENDING');
            expect(res.body.data.method).toBe('CASH');
            expect(res.body.data.verificationCode).toBeDefined();

            testPaymentId = res.body.data.id;
            verificationCode = res.body.data.verificationCode;
        });

        it('should fetch payment details by ID', async () => {
            if (!testPaymentId) throw new Error('testPaymentId is not defined from previous test step');
            const res = await request(app)
                .get(`/api/v1/payments/${testPaymentId}`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(testPaymentId);
            expect(Number(res.body.data.amount)).toBe(1100);
        });

        it('should fetch payment details by order ID', async () => {
            const res = await request(app)
                .get(`/api/v1/payments/order/${testOrderId}`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(testPaymentId);
        });
    });

    describe('Cash Payment Confirmation', () => {
        it('should fail to confirm if rider is not assigned to order', async () => {
            const res = await request(app)
                .post(`/api/v1/payments/${testPaymentId}/confirm`)
                .set('Authorization', `Bearer ${riderToken}`)
                .send({
                    amountReceived: 1100,
                    verificationCode: verificationCode
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('not assigned');
        });

        it('should confirm payment successfully when assigned as rider', async () => {
            // Assign rider to order first
            await prisma.order.update({
                where: { id: testOrderId },
                data: { deliveryPersonId: riderId }
            });

            const res = await request(app)
                .post(`/api/v1/payments/${testPaymentId}/confirm`)
                .set('Authorization', `Bearer ${riderToken}`)
                .send({
                    amountReceived: 1100,
                    verificationCode: verificationCode
                });

            if (res.status !== 200) console.log('Confirm Fail:', res.body);

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('COMPLETED');
            expect(Number(res.body.data.amountReceived)).toBe(1100);
            expect(res.body.data.receivedBy).toBe(riderId);
        });
    });

    describe('Payment History & Rider Collections', () => {
        it('should fetch user payment history', async () => {
            const res = await request(app)
                .get('/api/v1/payments/history')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data.some(p => p.id === testPaymentId)).toBe(true);
        });

        it('should fetch rider cash collections', async () => {
            const res = await request(app)
                .get('/api/v1/payments/rider/collections')
                .set('Authorization', `Bearer ${riderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.totalCollected).toBeGreaterThanOrEqual(1100);
            expect(res.body.data.cashInHand).toBeGreaterThanOrEqual(1100);
            expect(res.body.data.collections.some(c => c.orderId === testOrderId)).toBe(true);
        });
    });

    describe('Rider Deposit', () => {
        it('should allow rider to submit deposit proof', async () => {
            const res = await request(app)
                .post('/api/v1/payments/rider/deposit')
                .set('Authorization', `Bearer ${riderToken}`)
                .send({
                    amount: 500,
                    depositProof: 'https://cloudinary.com/test-receipt.png',
                    notes: 'Weekly deposit'
                });

            expect(res.status).toBe(201);
            expect(Number(res.body.data.deposit.amount)).toBe(500);
            expect(res.body.data.deposit.status).toBe('pending');
            expect(res.body.data.remainingBalance).toBeDefined();

            // Cleanup deposit record
            await prisma.riderCashDeposit.delete({ where: { id: res.body.data.deposit.id } });
        });

        it('should fail if deposit amount exceeds cash in hand', async () => {
            const collectionsRes = await request(app)
                .get('/api/v1/payments/rider/collections')
                .set('Authorization', `Bearer ${riderToken}`);

            const cashInHand = collectionsRes.body.data.cashInHand;

            const res = await request(app)
                .post('/api/v1/payments/rider/deposit')
                .set('Authorization', `Bearer ${riderToken}`)
                .send({
                    amount: cashInHand + 1000,
                    depositProof: 'https://cloudinary.com/test-receipt.png'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Insufficient cash in hand');
        });
    });
});
