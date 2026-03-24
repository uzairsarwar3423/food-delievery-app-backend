// =============================================================
// src/routes/v1/__tests__/admin_notifications.test.js — Admin & Notification Integration Tests
// =============================================================

require('dotenv').config();
const request = require('supertest');
const app = require('../../../app');
const { prisma } = require('../../../config/database');
const { disconnectRedis } = require('../../../config/redis');

jest.setTimeout(60000);

describe('Admin & Notification Integration Tests (Day 14)', () => {
    let adminToken = '';
    let userToken = '';
    let adminUser = null;
    let regularUser = null;
    let testRestaurantId = '';
    let testRiderId = '';
    let testDocumentId = '';
    let testPayoutId = '';
    let testNotificationId = '';

    beforeAll(async () => {
        await prisma.$connect();

        // 1. Create Admin User
        const adminData = {
            email: `admin_${Date.now()}@test.com`,
            phone: `+923${Math.floor(Math.random() * 900000000 + 100000000)}`,
            password: 'AdminPassword123!',
            firstName: 'Admin',
            lastName: 'User',
        };

        const adminReg = await request(app).post('/api/v1/auth/register').send(adminData);
        if (adminReg.status !== 201) {
            console.log('DEBUG: Admin Registration Failed', adminReg.body);
        }
        expect(adminReg.status).toBe(201);
        adminUser = adminReg.body.data.user;

        await prisma.user.update({
            where: { id: adminUser.id },
            data: { role: 'ADMIN', isEmailVerified: true },
        });

        const adminLogin = await request(app).post('/api/v1/auth/login').send({
            identifier: adminData.email,
            password: adminData.password,
        });
        adminToken = adminLogin.body.data.accessToken;

        // 2. Create Regular User
        const userData = {
            email: `user_${Date.now()}@test.com`,
            phone: `+923${Math.floor(Math.random() * 900000000 + 100000000)}`,
            password: 'UserPassword123!',
            firstName: 'Regular',
            lastName: 'User',
        };
        const userReg = await request(app).post('/api/v1/auth/register').send(userData);
        expect(userReg.status).toBe(201);
        regularUser = userReg.body.data.user;
        await prisma.user.update({
            where: { id: regularUser.id },
            data: { isEmailVerified: true },
        });

        const userLogin = await request(app).post('/api/v1/auth/login').send({
            identifier: userData.email,
            password: userData.password,
        });
        userToken = userLogin.body.data.accessToken;

        // 3. Create Pending Restaurant
        const restaurant = await prisma.restaurant.create({
            data: {
                name: 'Pending Restaurant',
                slug: `pending-restaurant-${Date.now()}`,
                phone: '1234567890',
                email: `rest_${Date.now()}@test.com`,
                addressLine1: 'Test Address',
                city: 'Test City',
                state: 'Test State',
                postalCode: '12345',
                latitude: 0,
                longitude: 0,
                ownerId: regularUser.id,
                status: 'PENDING_APPROVAL',
            },
        });
        testRestaurantId = restaurant.id;

        // 4. Create Pending Rider with Document
        const riderUser = await prisma.user.create({
            data: {
                email: `rider_${Date.now()}@test.com`,
                phone: `+923${Math.floor(Math.random() * 900000000 + 100000000)}`,
                passwordHash: 'hashed',
                firstName: 'Rider',
                lastName: 'Test',
                role: 'DELIVERY_PERSON',
            }
        });
        const rider = await prisma.deliveryPerson.create({
            data: {
                userId: riderUser.id,
                vehicleType: 'BIKE',
                vehicleNumber: 'ABC-123',
                licenseNumber: 'L-123',
                cnicNumber: `${Math.floor(Math.random() * 9000000000000 + 1000000000000)}`,
                status: 'OFFLINE',
            }
        });
        testRiderId = rider.id;
        const doc = await prisma.riderDocument.create({
            data: {
                deliveryPersonId: rider.id,
                documentType: 'LICENSE',
                documentUrl: 'http://test.com/doc.jpg',
                status: 'PENDING',
            }
        });
        testDocumentId = doc.id;

        // 5. Create Payout Request
        const payout = await prisma.payoutRequest.create({
            data: {
                riderId: rider.id,
                amount: 1000,
                status: 'PENDING',
                bankName: 'Test Bank',
                accountNumber: '123456',
                accountName: 'Rider Test',
            }
        });
        testPayoutId = payout.id;
    });

    afterAll(async () => {
        if (testRiderId) {
            await prisma.payoutRequest.deleteMany({ where: { riderId: testRiderId } }).catch(() => { });
            await prisma.riderDocument.deleteMany({ where: { deliveryPersonId: testRiderId } }).catch(() => { });
            await prisma.deliveryPerson.delete({ where: { id: testRiderId } }).catch(() => { });
        }
        if (testRestaurantId) {
            await prisma.restaurant.delete({ where: { id: testRestaurantId } }).catch(() => { });
        }
        if (adminUser) {
            await prisma.adminLog.deleteMany({ where: { adminId: adminUser.id } }).catch(() => { });
            await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => { });
        }
        if (regularUser) {
            await prisma.notification.deleteMany({ where: { userId: regularUser.id } }).catch(() => { });
            await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => { });
        }

        await prisma.$disconnect();
        await disconnectRedis();
    });

    describe('Admin Operations', () => {
        it('should fetch dashboard stats', async () => {
            const res = await request(app)
                .get('/api/v1/admin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('stats');
        });

        it('should manage user status', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/users/${regularUser.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false });

            expect(res.status).toBe(200);
            expect(res.body.data.isActive).toBe(false);

            // Reactive for next tests via API to clear cache
            const res2 = await request(app)
                .put(`/api/v1/admin/users/${regularUser.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: true });
            expect(res2.status).toBe(200);
        });

        it('should approve restaurant', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/restaurants/${testRestaurantId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('APPROVED');
        });

        it('should verify rider document', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/riders/documents/${testDocumentId}/verify`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'APPROVED' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('APPROVED');
        });

        it('should fetch analytics', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await request(app)
                .get(`/api/v1/admin/analytics/revenue?dateFrom=${today}&dateTo=${today}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
        });

        it('should process payout', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/payouts/${testPayoutId}/process`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: 'COMPLETED',
                    adminNotes: 'Paid',
                    transactionId: 'TXN_TEST',
                });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('COMPLETED');
        });
    });

    describe('Notifications', () => {
        it('should fetch notifications', async () => {
            const res = await request(app)
                .get('/api/v1/notifications')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            if (res.body.data.length > 0) {
                testNotificationId = res.body.data[0].id;
            }
        });

        it('should update preferences', async () => {
            const res = await request(app)
                .put('/api/v1/notifications/preferences')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ email: true, push: false, sms: false });

            expect(res.status).toBe(200);
            expect(res.body.data.push).toBe(false);
        });

        it('should mark as read', async () => {
            if (!testNotificationId) return;
            const res = await request(app)
                .put(`/api/v1/notifications/${testNotificationId}/read`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
        });

        it('should delete notification', async () => {
            if (!testNotificationId) return;
            const res = await request(app)
                .delete(`/api/v1/notifications/${testNotificationId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(204);
        });
    });
});
