const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS, ORDER_STATUS } = require('../utils/constants');
const { getPaginationParams, buildPaginationMeta } = require('../utils/helpers');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } = require('date-fns');

class EarningsService {
    /**
     * Get earnings summary for a rider
     */
    async getEarningsSummary(riderId) {
        const now = new Date();
        const todayStart = startOfDay(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const monthStart = startOfMonth(now);

        const [today, week, month, pendingPayout] = await Promise.all([
            this._calculateEarnings(riderId, todayStart, endOfDay(now)),
            this._calculateEarnings(riderId, weekStart, endOfDay(now)),
            this._calculateEarnings(riderId, monthStart, endOfDay(now)),
            this.getPendingPayoutAmount(riderId)
        ]);

        return {
            today,
            week,
            month,
            pending: pendingPayout
        };
    }

    /**
     * Get today's earnings details
     */
    async getTodayEarnings(riderId) {
        const now = new Date();
        const start = startOfDay(now);
        const end = endOfDay(now);

        const orders = await prisma.order.findMany({
            where: {
                deliveryPersonId: riderId,
                status: ORDER_STATUS.DELIVERED,
                deliveredAt: {
                    gte: start,
                    lte: end
                }
            },
            select: {
                id: true,
                orderNumber: true,
                riderEarnings: true,
                tipAmount: true,
                bonusAmount: true,
                deliveredAt: true
            }
        });

        const stats = orders.reduce((acc, order) => {
            acc.totalEarnings += Number(order.riderEarnings) + Number(order.tipAmount) + Number(order.bonusAmount);
            acc.deliveries += 1;
            acc.tips += Number(order.tipAmount);
            acc.bonuses += Number(order.bonusAmount);
            return acc;
        }, { totalEarnings: 0, deliveries: 0, tips: 0, bonuses: 0 });

        return {
            ...stats,
            orders
        };
    }

    /**
     * Get trip history with earnings
     */
    async getTripHistory(riderId, filters) {
        const { page = 1, limit = 10, dateFrom, dateTo } = filters;
        const { skip, take } = getPaginationParams(page, limit);

        const where = {
            deliveryPersonId: riderId,
            status: ORDER_STATUS.DELIVERED
        };

        if (dateFrom || dateTo) {
            where.deliveredAt = {};
            if (dateFrom) where.deliveredAt.gte = new Date(dateFrom);
            if (dateTo) where.deliveredAt.lte = new Date(dateTo);
        }

        const [trips, total] = await Promise.all([
            prisma.order.findMany({
                where,
                select: {
                    id: true,
                    orderNumber: true,
                    riderEarnings: true,
                    tipAmount: true,
                    bonusAmount: true,
                    deliveredAt: true,
                    restaurant: {
                        select: { name: true }
                    }
                },
                orderBy: { deliveredAt: 'desc' },
                skip,
                take
            }),
            prisma.order.count({ where })
        ]);

        const tripsWithTotal = trips.map(trip => ({
            ...trip,
            totalEarnings: Number(trip.riderEarnings) + Number(trip.tipAmount) + Number(trip.bonusAmount)
        }));

        const totalEarnings = tripsWithTotal.reduce((sum, trip) => sum + trip.totalEarnings, 0);

        return {
            trips: tripsWithTotal,
            totalEarnings,
            pagination: buildPaginationMeta(total, page, limit)
        };
    }

    /**
     * Get earnings breakdown for a period
     */
    async getEarningsBreakdown(riderId, period = 'week') {
        const now = new Date();
        let start;
        let groupByFormat;

        if (period === 'week') {
            start = startOfWeek(now, { weekStartsOn: 1 });
            groupByFormat = 'yyyy-MM-dd';
        } else if (period === 'month') {
            start = startOfMonth(now);
            groupByFormat = 'yyyy-MM-dd';
        } else if (period === 'year') {
            start = new Date(now.getFullYear(), 0, 1);
            groupByFormat = 'yyyy-MM';
        } else {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid period. Use week, month, or year.');
        }

        const orders = await prisma.order.findMany({
            where: {
                deliveryPersonId: riderId,
                status: ORDER_STATUS.DELIVERED,
                deliveredAt: {
                    gte: start
                }
            },
            select: {
                riderEarnings: true,
                tipAmount: true,
                bonusAmount: true,
                deliveredAt: true
            }
        });

        const breakdown = orders.reduce((acc, order) => {
            const dateKey = format(order.deliveredAt, groupByFormat);
            if (!acc[dateKey]) {
                acc[dateKey] = { date: dateKey, total: 0, tips: 0, bonuses: 0, count: 0 };
            }
            acc[dateKey].total += Number(order.riderEarnings) + Number(order.tipAmount) + Number(order.bonusAmount);
            acc[dateKey].tips += Number(order.tipAmount);
            acc[dateKey].bonuses += Number(order.bonusAmount);
            acc[dateKey].count += 1;
            return acc;
        }, {});

        return Object.values(breakdown).sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Get pending payout amount
     */
    async getPendingPayoutAmount(riderId) {
        // Total earnings from all delivered orders
        const orders = await prisma.order.aggregate({
            where: {
                deliveryPersonId: riderId,
                status: ORDER_STATUS.DELIVERED
            },
            _sum: {
                riderEarnings: true,
                tipAmount: true,
                bonusAmount: true
            }
        });

        const totalEarned = Number(orders._sum.riderEarnings || 0) +
            Number(orders._sum.tipAmount || 0) +
            Number(orders._sum.bonusAmount || 0);

        // Total amount already paid or being processed
        const payouts = await prisma.payoutRequest.aggregate({
            where: {
                riderId: riderId,
                status: {
                    in: ['PENDING', 'PROCESSING', 'COMPLETED']
                }
            },
            _sum: {
                amount: true
            }
        });

        const totalPaidOrProcessing = Number(payouts._sum.amount || 0);

        return Math.max(0, totalEarned - totalPaidOrProcessing);
    }

    /**
     * Get pending payout details breakdown
     */
    async getPendingPayoutDetails(riderId) {
        const pendingAmount = await this.getPendingPayoutAmount(riderId);

        // This is a bit complex if we want a precise breakdown since we don't track "paid" status per order.
        // We can estimate based on the pending amount's proportion to total earnings.
        // Or we can fetch orders that haven't been "payout-referenced" if we had a relation.
        // For now, let's just return the amount and a logical breakdown from lifetime stats minus payouts.

        const lifetime = await prisma.order.aggregate({
            where: {
                deliveryPersonId: riderId,
                status: ORDER_STATUS.DELIVERED
            },
            _sum: {
                riderEarnings: true,
                tipAmount: true,
                bonusAmount: true
            }
        });

        return {
            pendingAmount,
            breakdown: {
                deliveryFees: Number(lifetime._sum.riderEarnings || 0),
                tips: Number(lifetime._sum.tipAmount || 0),
                bonuses: Number(lifetime._sum.bonusAmount || 0)
            }
        };
    }

    /**
     * Request a payout
     */
    async requestPayout(riderId, { amount }) {
        const MIN_PAYOUT = 1000;

        if (amount < MIN_PAYOUT) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Minimum payout amount is PKR ${MIN_PAYOUT}`);
        }

        const rider = await prisma.deliveryPerson.findUnique({
            where: { id: riderId }
        });

        if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

        // Check if bank details exist
        if (!rider.bankAccountNumber || !rider.bankName || !rider.bankAccountName) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Please complete your bank details before requesting a payout');
        }

        // Check pending balance
        const pendingBalance = await this.getPendingPayoutAmount(riderId);
        if (amount > pendingBalance) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Amount exceeds your available balance');
        }

        // Create payout request
        const payoutRequest = await prisma.payoutRequest.create({
            data: {
                riderId,
                amount,
                bankName: rider.bankName,
                accountNumber: rider.bankAccountNumber,
                accountName: rider.bankAccountName,
                status: 'PENDING'
            }
        });

        // Notify admin logic would go here (e.g. email, push notification, admin dashboard update)
        // For now, we'll just return the request

        return payoutRequest;
    }

    /**
     * Get payout history
     */
    async getPayoutHistory(riderId, { page = 1, limit = 10 }) {
        const { skip, take } = getPaginationParams(page, limit);

        const [payouts, total] = await Promise.all([
            prisma.payoutRequest.findMany({
                where: { riderId },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.payoutRequest.count({
                where: { riderId }
            })
        ]);

        return {
            payouts,
            pagination: buildPaginationMeta(total, page, limit)
        };
    }

    /**
     * Get payout details
     */
    async getPayoutDetails(riderId, payoutId) {
        const payout = await prisma.payoutRequest.findFirst({
            where: {
                id: payoutId,
                riderId
            }
        });

        if (!payout) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payout request not found');

        return payout;
    }

    /**
     * Internal helper to calculate earnings in a range
     */
    async _calculateEarnings(riderId, start, end) {
        const result = await prisma.order.aggregate({
            where: {
                deliveryPersonId: riderId,
                status: ORDER_STATUS.DELIVERED,
                deliveredAt: {
                    gte: start,
                    lte: end
                }
            },
            _sum: {
                riderEarnings: true,
                tipAmount: true,
                bonusAmount: true
            }
        });

        return Number(result._sum.riderEarnings || 0) +
            Number(result._sum.tipAmount || 0) +
            Number(result._sum.bonusAmount || 0);
    }
}

module.exports = new EarningsService();
