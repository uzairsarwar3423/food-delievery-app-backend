const { prisma } = require('../config/database');

/**
 * Admin Repository
 */
class AdminRepository {
    /**
     * Get overall dashboard stats
     */
    async getOverallStats() {
        const [totalUsers, totalRestaurants, totalOrders, totalRiders] = await Promise.all([
            prisma.user.count(),
            prisma.restaurant.count(),
            prisma.order.count(),
            prisma.deliveryPerson.count(),
        ]);

        return {
            totalUsers,
            totalRestaurants,
            totalOrders,
            totalRiders,
        };
    }

    /**
     * Get stats for a specific day (default today)
     */
    async getDailyStats(date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const [newUsers, newOrders, totalRevenue] = await Promise.all([
            prisma.user.count({
                where: { createdAt: { gte: startOfDay, lte: endOfDay } },
            }),
            prisma.order.count({
                where: { createdAt: { gte: startOfDay, lte: endOfDay } },
            }),
            prisma.order.aggregate({
                where: {
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: 'DELIVERED',
                },
                _sum: { totalAmount: true },
            }),
        ]);

        return {
            date: startOfDay.toISOString().split('T')[0],
            newUsers,
            newOrders,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
        };
    }

    /**
     * Get pending approvals count
     */
    async getPendingApprovalsCount() {
        const [pendingRestaurants, pendingRiders] = await Promise.all([
            prisma.restaurant.count({ where: { status: 'PENDING_APPROVAL' } }),
            prisma.deliveryPerson.count({ where: { isDocumentVerified: false } }),
        ]);

        return {
            pendingRestaurants,
            pendingRiders,
            totalPending: pendingRestaurants + pendingRiders,
        };
    }

    /**
     * Log admin action
     */
    async logAction(adminId, action, entity, entityId, oldValues = null, newValues = null) {
        return prisma.adminLog.create({
            data: {
                adminId,
                action,
                entity,
                entityId,
                oldValues,
                newValues,
            },
        });
    }

    /**
     * Get all users with filters and pagination
     */
    async findAllUsers(filters = {}, pagination = {}) {
        const { page = 1, limit = 10, search, role, status } = filters;
        const skip = (page - 1) * limit;

        const where = {};
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (role) { where.role = role; }
        if (status !== undefined) { where.isActive = status === 'true' || status === true; }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        return {
            users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get pending restaurants
     */
    async findPendingRestaurants() {
        return prisma.restaurant.findMany({
            where: { status: 'PENDING_APPROVAL' },
            include: { owner: true },
        });
    }

    /**
     * Get pending riders (riders with unverified documents)
     */
    async findPendingRiders() {
        return prisma.deliveryPerson.findMany({
            where: {
                documents: {
                    some: { status: 'PENDING' },
                },
            },
            include: {
                user: true,
                documents: true,
            },
        });
    }

    /**
     * Get revenue analytics
     */
    async getRevenueAnalytics(dateFrom, dateTo, groupBy = 'day') {
        // Note: Complex aggregation like grouping by day/week/month in Prisma 
        // often requires raw SQL for PostgreSQL to be efficient.
        // Simplifying for now with a basic query.

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
                status: 'DELIVERED',
            },
            select: {
                createdAt: true,
                totalAmount: true,
                subtotal: true,
                deliveryFee: true,
                taxAmount: true,
                discountAmount: true,
            },
        });

        // Manual grouping (simplistic)
        const breakdown = {};
        orders.forEach(order => {
            let key;
            const d = new Date(order.createdAt);
            if (groupBy === 'day') {
                key = d.toISOString().split('T')[0];
            } else if (groupBy === 'week') {
                // Simple week key logic
                const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
                const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
                key = `${d.getFullYear()}-W${Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)}`;
            } else if (groupBy === 'month') {
                key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            }

            if (!breakdown[key]) {
                breakdown[key] = { revenue: 0, orders: 0, subtotal: 0, deliveryFees: 0 };
            }
            breakdown[key].revenue += Number(order.totalAmount);
            breakdown[key].subtotal += Number(order.subtotal);
            breakdown[key].deliveryFees += Number(order.deliveryFee);
            breakdown[key].orders += 1;
        });

        return Object.keys(breakdown).map(key => ({
            period: key,
            ...breakdown[key],
        })).sort((a, b) => a.period.localeCompare(b.period));
    }

    /**
     * Get order analytics
     */
    async getOrderAnalytics(dateFrom, dateTo) {
        const start = new Date(dateFrom);
        const end = new Date(dateTo);

        const stats = await prisma.order.groupBy({
            by: ['status'],
            where: {
                createdAt: { gte: start, lte: end },
            },
            _count: { _all: true },
            _sum: { totalAmount: true },
        });

        return stats.map(s => ({
            status: s.status,
            count: s._count._all,
            totalRevenue: s._sum.totalAmount || 0,
        }));
    }

    /**
     * Get user analytics
     */
    async getUserAnalytics(dateFrom, dateTo) {
        const stats = await prisma.user.groupBy({
            by: ['role'],
            where: {
                createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
            },
            _count: { _all: true },
        });

        return stats.map(s => ({
            role: s.role,
            count: s._count._all,
        }));
    }

    /**
     * Get restaurant analytics
     */
    async getRestaurantAnalytics() {
        const stats = await prisma.restaurant.groupBy({
            by: ['status'],
            _count: { _all: true },
        });

        return stats.map(s => ({
            status: s.status,
            count: s._count._all,
        }));
    }
}

module.exports = new AdminRepository();
