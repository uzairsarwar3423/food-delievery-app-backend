const { prisma } = require('../config/database');
const { cacheDel } = require('../config/redis');
const adminRepository = require('../repositories/admin.repository');
const userRepository = require('../repositories/user.repository');
const restaurantRepository = require('../repositories/restaurant.repository');
const riderRepository = require('../repositories/rider.repository');
const orderRepository = require('../repositories/order.repository');
const notificationService = require('./notification.service');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * Admin Service
 */
class AdminService {
    /**
     * Get dashboard data
     */
    async getDashboardData() {
        const stats = await adminRepository.getOverallStats();
        const todayStats = await adminRepository.getDailyStats();
        const pendingApprovals = await adminRepository.getPendingApprovalsCount();

        return {
            stats,
            todayStats,
            pendingApprovals,
        };
    }

    /**
     * Get all users
     */
    async getUsers(filters) {
        return adminRepository.findAllUsers(filters);
    }

    /**
     * Update user status (activate/deactivate)
     */
    async updateUserStatus(adminId, userId, isActive) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw ApiError.notFound('User not found');
        }

        const oldValues = { isActive: user.isActive };
        const updatedUser = await userRepository.update(userId, { isActive });

        // Log action
        await adminRepository.logAction(
            adminId,
            isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
            'User',
            userId,
            oldValues,
            { isActive }
        );

        // Clear user cache
        await cacheDel(`user:${userId}`);

        // If blocking, cancel active orders/deliveries
        if (!isActive) {
            await this.handleUserDeactivation(userId, user.role);
        }

        return updatedUser;
    }

    /**
     * Handle deactivation logic
     */
    async handleUserDeactivation(userId, role) {
        if (role === 'CUSTOMER') {
            logger.info(`Deactivating orders for customer ${userId}`);
        } else if (role === 'DELIVERY_PERSON') {
            logger.info(`Unassigning deliveries for rider ${userId}`);
        }
    }

    /**
     * Get pending restaurants
     */
    async getPendingRestaurants() {
        const restaurants = await restaurantRepository.findManyByStatus('PENDING_APPROVAL');
        return restaurants;
    }

    /**
     * Approve restaurant
     */
    async approveRestaurant(adminId, restaurantId) {
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
            throw ApiError.notFound('Restaurant not found');
        }

        const updatedRestaurant = await restaurantRepository.update(restaurantId, {
            status: 'APPROVED',
        });

        await adminRepository.logAction(
            adminId,
            'APPROVE_RESTAURANT',
            'Restaurant',
            restaurantId,
            { status: restaurant.status },
            { status: 'APPROVED' }
        );

        await notificationService.send(restaurant.ownerId, {
            type: 'SYSTEM',
            title: '🎉 Restaurant Approved!',
            body: `Your restaurant "${restaurant.name}" has been approved. You can now start taking orders.`,
        });

        return updatedRestaurant;
    }

    /**
     * Reject restaurant
     */
    async rejectRestaurant(adminId, restaurantId, reason) {
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
            throw ApiError.notFound('Restaurant not found');
        }

        const updatedRestaurant = await restaurantRepository.update(restaurantId, {
            status: 'SUSPENDED',
        });

        await adminRepository.logAction(
            adminId,
            'REJECT_RESTAURANT',
            'Restaurant',
            restaurantId,
            { status: restaurant.status },
            { status: 'REJECTED', reason }
        );

        await notificationService.send(restaurant.ownerId, {
            type: 'SYSTEM',
            title: '❌ Restaurant Application Update',
            body: `Your restaurant application has been rejected. Reason: ${reason}`,
        });

        return updatedRestaurant;
    }

    /**
     * Get pending rider verifications
     */
    async getPendingRiders() {
        return adminRepository.findPendingRiders();
    }

    /**
     * Verify rider document
     */
    async verifyRiderDocument(adminId, documentId, status, rejectionReason) {
        const document = await riderRepository.updateDocument(documentId, {
            status,
            reviewNote: rejectionReason,
            reviewedBy: adminId,
            reviewedAt: new Date(),
        });

        await adminRepository.logAction(
            adminId,
            'VERIFY_DOCUMENT',
            'RiderDocument',
            documentId,
            null,
            { status, rejectionReason }
        );

        return document;
    }

    /**
     * Get orders
     */
    async getOrders(filters) {
        return orderRepository.findAll(filters);
    }

    /**
     * Get revenue analytics
     */
    async getRevenueAnalytics(query) {
        const { dateFrom, dateTo, groupBy } = query;
        return adminRepository.getRevenueAnalytics(dateFrom, dateTo, groupBy);
    }

    /**
     * Get order analytics
     */
    async getOrderAnalytics(query) {
        const { dateFrom, dateTo } = query;
        return adminRepository.getOrderAnalytics(dateFrom, dateTo);
    }

    /**
     * Get user analytics
     */
    async getUserAnalytics(query) {
        const { dateFrom, dateTo } = query;
        return adminRepository.getUserAnalytics(dateFrom, dateTo);
    }

    /**
     * Get restaurant analytics
     */
    async getRestaurantAnalytics() {
        return adminRepository.getRestaurantAnalytics();
    }

    /**
     * Update system settings
     */
    async updateSettings(adminId, settings) {
        logger.info(`Admin ${adminId} updated system settings:`, settings);
        await adminRepository.logAction(adminId, 'UPDATE_SETTINGS', 'System', 'Global', null, settings);
        return settings;
    }

    /**
     * Create coupon
     */
    async createCoupon(adminId, couponData) {
        const data = {
            ...couponData,
            validFrom: new Date(couponData.validFrom),
            validUntil: new Date(couponData.validUntil),
        };

        const coupon = await prisma.coupon.create({ data });
        await adminRepository.logAction(adminId, 'CREATE_COUPON', 'Coupon', coupon.id, null, data);
        return coupon;
    }

    /**
     * Process payout request
     */
    async processPayout(adminId, payoutId, status, adminNotes, transactionId) {
        const payout = await prisma.payoutRequest.findUnique({
            where: { id: payoutId },
            include: { rider: true }
        });
        if (!payout) {
            throw ApiError.notFound('Payout request not found');
        }

        const updatedPayout = await prisma.payoutRequest.update({
            where: { id: payoutId },
            data: {
                status,
                adminNotes,
                transactionId,
                processedAt: status === 'COMPLETED' ? new Date() : null,
            },
        });

        await adminRepository.logAction(adminId, 'PROCESS_PAYOUT', 'PayoutRequest', payoutId, { status: payout.status }, { status });

        await notificationService.send(payout.rider.userId, {
            type: 'SYSTEM',
            title: status === 'COMPLETED' ? '💸 Payout Processed' : '❌ Payout Rejected',
            body: status === 'COMPLETED'
                ? `Your payout request for ${payout.amount} has been processed successfully.`
                : `Your payout request has been rejected. Note: ${adminNotes}`,
        });

        return updatedPayout;
    }
}

module.exports = new AdminService();
