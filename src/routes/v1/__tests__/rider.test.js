// =============================================================
// src/routes/v1/__tests__/rider.test.js — Rider System Tests
// =============================================================

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');

jest.setTimeout(60000);

describe('Rider System Integration Tests', () => {
    const timestamp = Date.now();
    const testRider = {
        email: `rider_${timestamp}@delivery.pk`,
        password: 'RiderPassword123!',
        phone: `+92300${Math.floor(Math.random() * 9000000 + 1000000)}`,
        fullName: 'Test Rider',
        dateOfBirth: '1995-01-01',
        cnicNumber: `${Math.floor(Math.random() * 90000 + 10000)}-${Math.floor(Math.random() * 9000000 + 1000000)}-${Math.floor(Math.random() * 9 + 1)}`,
        vehicleType: 'MOTORCYCLE',
        vehicleNumber: `ABC-${timestamp % 10000}`,
        licenseNumber: `LIC-${timestamp}`,
        licenseExpiry: '2030-01-01',
    };

    let accessToken = '';
    let riderId = '';
    let userId = '';

    beforeAll(async () => {
        await prisma.$connect();
    });

    afterAll(async () => {
        // --- CLEANUP DISABLED FOR USER INSPECTION ---
        // if (riderId) {
        //     await prisma.riderDocument.deleteMany({ where: { deliveryPersonId: riderId } }).catch(() => { });
        //     await prisma.deliveryPerson.delete({ where: { id: riderId } }).catch(() => { });
        // }
        // if (userId) {
        //     await prisma.user.delete({ where: { id: userId } }).catch(() => { });
        // }
        await prisma.$disconnect();
        await disconnectRedis();
    });


    describe('Rider Authentication & Registration', () => {
        it('1. should register a new rider', async () => {
            const res = await request(app)
                .post('/api/v1/rider/auth/register')
                .send(testRider);

            expect(res.status).toBe(201);
            expect(res.body.data.user.email).toBe(testRider.email);
            expect(res.body.data.deliveryPerson.cnicNumber).toBe(testRider.cnicNumber);
            accessToken = res.body.data.tokens.accessToken;
            userId = res.body.data.user.id;
            riderId = res.body.data.deliveryPerson.id;
        });

        it('should fail to register with same email', async () => {
            const res = await request(app)
                .post('/api/v1/rider/auth/register')
                .send(testRider);

            expect(res.status).toBe(409);
        });
    });

    describe('Rider Profile Management', () => {
        it('2. should fetch rider profile', async () => {
            const res = await request(app)
                .get('/api/v1/rider/profile')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.riderProfile.user.email).toBe(testRider.email);
            expect(res.body.data.riderProfile.stats).toBeDefined();
        });

        it('3. should update rider profile', async () => {
            const res = await request(app)
                .put('/api/v1/rider/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    vehicleNumber: 'UPDATED-123',
                    bankName: 'Test Bank'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.riderProfile.vehicleNumber).toBe('UPDATED-123');
        });
    });

    describe('Document Management', () => {
        it('4. should upload a document (not implemented in test with real file, but mocked status check)', async () => {
            // Since it's hard to send a real file in this environment without a temp file
            // we'll just check if the route is protected and validated
            const res = await request(app)
                .post('/api/v1/rider/documents/upload')
                .set('Authorization', `Bearer ${accessToken}`)
                .field('documentType', 'CNIC_FRONT');
            // No file attached here, should return 400

            expect(res.status).toBe(400);
        });

        it('5. should fetch rider documents', async () => {
            const res = await request(app)
                .get('/api/v1/rider/documents')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data.documents)).toBe(true);
        });

        it('12. should get verification status summary', async () => {
            const res = await request(app)
                .get('/api/v1/rider/verification-status')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.overallStatus).toBeDefined();
            expect(Array.isArray(res.body.data.documents)).toBe(true);
        });
    });

    describe('Rider Status & Availability', () => {
        it('6. should update availability', async () => {
            const res = await request(app)
                .put('/api/v1/rider/availability')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ isAvailable: true });

            expect(res.status).toBe(200);
            expect(res.body.data.isAvailable).toBe(true);
        });

        it('7. should update online status', async () => {
            const res = await request(app)
                .put('/api/v1/rider/online-status')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ isOnline: false });

            expect(res.status).toBe(200);
            expect(res.body.data.isOnline).toBe(false);
        });
    });

    describe('Rider Stats & Ratings', () => {
        it('8. should fetch stats', async () => {
            const res = await request(app)
                .get('/api/v1/rider/stats')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.stats.totalDeliveries).toBeDefined();
        });

        it('9. should fetch ratings', async () => {
            const res = await request(app)
                .get('/api/v1/rider/ratings')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.reviews).toBeDefined();
        });
    });

    describe('Vehicle & Bank Details', () => {
        it('10. should update vehicle info', async () => {
            const res = await request(app)
                .post('/api/v1/rider/vehicle')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    vehicleType: 'CAR',
                    vehicleNumber: 'CAR-456',
                    vehicleMake: 'Honda',
                    vehicleModel: 'Civic',
                    vehicleColor: 'Black'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.vehicleInfo.vehicleType).toBe('CAR');
        });

        it('11. should update bank details', async () => {
            const res = await request(app)
                .put('/api/v1/rider/bank-details')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    bankAccountName: 'Test Rider',
                    bankAccountNumber: '1234567890123',
                    bankName: 'Test Bank'
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Bank details updated');
        });
    });
});
