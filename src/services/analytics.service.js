/**
 * src/services/analytics.service.js
 * Analytics Business Logic for Restaurant Owners
 */

const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS } = require('../utils/constants');
const { startOfDay, endOfDay, subDays, startOfHour, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');

class AnalyticsService {
    /**
     * 1. Dashboard Stats Summary
     */
    async getDashboardStats(restaurantId) {
        const now = new Date();
        const last30DaysStart = startOfDay(subDays(now, 30));
        const prev30DaysStart = startOfDay(subDays(now, 60));

        // Current 30 days stats
        const currentStats = await prisma.order.aggregate({
            where: {
                restaurantId,
                createdAt: { gte: last30DaysStart },
                status: ORDER_STATUS.DELIVERED,
            },
            _count: { _all: true },
            _sum: { totalAmount: true },
        });

        // Previous 30 days stats for growth calculation
        const prevStats = await prisma.order.aggregate({
            where: {
                restaurantId,
                createdAt: { gte: prev30DaysStart, lt: last30DaysStart },
                status: ORDER_STATUS.DELIVERED,
            },
            _sum: { totalAmount: true },
        });

        const totalOrders = currentStats._count._all;
        const totalRevenue = Number(currentStats._sum.totalAmount) || 0;
        const prevRevenue = Number(prevStats._sum.totalAmount) || 0;

        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 100;

        // Unique customers
        const uniqueCustomersCount = await prisma.order.groupBy({
            by: ['customerId'],
            where: { restaurantId },
            _count: { customerId: true },
        });

        return {
            totalOrders,
            totalRevenue,
            averageOrderValue,
            growth: Number(growth.toFixed(2)),
            uniqueCustomers: uniqueCustomersCount.length,
        };
    }

    /**
     * 2. Earnings Today
     */
    async getTodayEarnings(restaurantId) {
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        const yesterdayStart = startOfDay(subDays(today, 1));
        const yesterdayEnd = endOfDay(todayStart);

        const todayStats = await prisma.order.aggregate({
            where: {
                restaurantId,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: ORDER_STATUS.DELIVERED,
            },
            _count: { _all: true },
            _sum: { totalAmount: true },
        });

        const yesterdayStats = await prisma.order.aggregate({
            where: {
                restaurantId,
                createdAt: { gte: yesterdayStart, lt: todayStart },
                status: ORDER_STATUS.DELIVERED,
            },
            _sum: { totalAmount: true },
        });

        const totalEarnings = Number(todayStats._sum.totalAmount) || 0;
        const prevEarnings = Number(yesterdayStats._sum.totalAmount) || 0;
        const growth = prevEarnings > 0 ? ((totalEarnings - prevEarnings) / prevEarnings) * 100 : 100;

        return {
            totalEarnings,
            totalOrders: todayStats._count._all,
            growth: Number(growth.toFixed(2)),
        };
    }

    /**
     * 3. Revenue Summary (Weekly, Monthly, Yearly)
     */
    async getRevenueSummary(restaurantId) {
        const now = new Date();

        const [weekly, monthly, yearly] = await Promise.all([
            prisma.order.aggregate({
                where: { restaurantId, createdAt: { gte: subDays(now, 7) }, status: ORDER_STATUS.DELIVERED },
                _sum: { totalAmount: true }
            }),
            prisma.order.aggregate({
                where: { restaurantId, createdAt: { gte: subDays(now, 30) }, status: ORDER_STATUS.DELIVERED },
                _sum: { totalAmount: true }
            }),
            prisma.order.aggregate({
                where: { restaurantId, createdAt: { gte: subDays(now, 365) }, status: ORDER_STATUS.DELIVERED },
                _sum: { totalAmount: true }
            })
        ]);

        return {
            weekly: Number(weekly._sum.totalAmount) || 0,
            monthly: Number(monthly._sum.totalAmount) || 0,
            yearly: Number(yearly._sum.totalAmount) || 0,
        };
    }

    /**
     * 4. Revenue & Orders Breakdown (daily | weekly | monthly)
     */
    async getEarningsBreakdown(restaurantId, period) {
        const now = new Date();
        let startDate;
        let groupByRaw;

        if (period === 'daily') {
            startDate = startOfDay(now);
            // In Postgres, extract hour
            groupByRaw = 'EXTRACT(HOUR FROM created_at)';
        } else if (period === 'weekly') {
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            groupByRaw = 'EXTRACT(DOW FROM created_at)'; // 0=Sunday, 1=Monday...
        } else if (period === 'monthly') {
            startDate = startOfMonth(now);
            groupByRaw = 'DATE(created_at)';
        } else {
            throw ApiError.badRequest('Invalid period. Use daily, weekly, or monthly.');
        }

        // Using raw SQL for efficient grouping by date parts
        const breakdown = await prisma.$queryRaw`
      SELECT 
        ${Prisma.raw(groupByRaw)} as label,
        SUM(total_amount) as revenue,
        COUNT(id) as orders
      FROM orders
      WHERE restaurant_id = ${restaurantId}::uuid
        AND created_at >= ${startDate}
        AND status = ${ORDER_STATUS.DELIVERED}::text::"OrderStatus"
      GROUP BY label
      ORDER BY label ASC
    `;

        return breakdown.map(item => ({
            label: item.label.toString(),
            revenue: Number(item.revenue) || 0,
            orders: Number(item.orders) || 0,
        }));
    }

    /**
     * 5. Menu Item Performance (Top 5 Best & Bottom 5 Least)
     */
    async getMenuItemPerformance(restaurantId) {
        const itemsPerformance = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: {
                order: {
                    restaurantId,
                    status: ORDER_STATUS.DELIVERED,
                }
            },
            _sum: {
                quantity: true,
                subtotal: true,
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            }
        });

        // Fetch item names
        const menuItemIds = itemsPerformance.map(i => i.menuItemId);
        const menuItems = await prisma.menuItem.findMany({
            where: { id: { in: menuItemIds } },
            select: { id: true, name: true }
        });

        const performance = itemsPerformance.map(item => {
            const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
            return {
                name: menuItem ? menuItem.name : 'Unknown Item',
                totalSales: item._sum.quantity || 0,
                totalRevenue: Number(item._sum.subtotal) || 0,
            };
        });

        return {
            topItems: performance.slice(0, 5),
            bottomItems: performance.slice(-5).reverse(),
        };
    }

    /**
     * 6. Category Distribution
     */
    async getCategoryDistribution(restaurantId) {
        const distribution = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: {
                order: {
                    restaurantId,
                    status: ORDER_STATUS.DELIVERED,
                }
            },
            _sum: {
                subtotal: true,
            }
        });

        // Fetch categories for these items
        const menuItemIds = distribution.map(i => i.menuItemId);
        const menuItems = await prisma.menuItem.findMany({
            where: { id: { in: menuItemIds } },
            select: {
                id: true,
                category: { select: { name: true } }
            }
        });

        const categoryRevenue = {};
        distribution.forEach(item => {
            const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
            const categoryName = menuItem?.category?.name || 'Uncategorized';
            categoryRevenue[categoryName] = (categoryRevenue[categoryName] || 0) + Number(item._sum.subtotal);
        });

        return Object.entries(categoryRevenue).map(([name, revenue]) => ({
            name,
            revenue
        }));
    }

    /**
     * 7. Peak Hours
     */
    async getPeakHours(restaurantId) {
        const peakHours = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(id) as count
      FROM orders
      WHERE restaurant_id = ${restaurantId}::uuid
        AND status = ${ORDER_STATUS.DELIVERED}::text::"OrderStatus"
      GROUP BY hour
      ORDER BY count DESC
    `;

        return peakHours.map(ph => ({
            hour: parseInt(ph.hour),
            count: Number(ph.count)
        }));
    }
}

module.exports = new AnalyticsService();
