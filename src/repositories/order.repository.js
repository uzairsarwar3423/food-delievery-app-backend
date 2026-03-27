/**
 * src/repositories/order.repository.js
 * Order Data Access Layer
 */

const { prisma } = require('../config/database');

class OrderRepository {
    /**
     * Create a new order with items and update cart/coupon
     */
    async createOrder(orderData, orderItems, paymentMethod, userId) {
        return prisma.$transaction(async (tx) => {
            // 1. Create the order
            const order = await tx.order.create({
                data: {
                    ...orderData,
                    orderItems: {
                        create: orderItems,
                    },
                },
                include: {
                    orderItems: true,
                    restaurant: {
                        select: {
                            name: true,
                            addressLine1: true,
                            phone: true,
                        },
                    },
                },
            });

            // 2. Create initial payment record
            const isCash = (paymentMethod || 'CASH') === 'CASH';
            const verificationCode = isCash ? Math.floor(100000 + Math.random() * 900000).toString() : null;

            await tx.payment.create({
                data: {
                    orderId: order.id,
                    amount: order.totalAmount,
                    method: paymentMethod || 'CASH',
                    status: 'PENDING',
                    verificationCode
                },
            });

            // 3. Clear cart items
            await tx.cartItem.deleteMany({
                where: { userId },
            });

            // 4. Clear active coupon from user
            await tx.user.update({
                where: { id: userId },
                data: { activeCouponId: null },
            });

            // 5. If coupon used, increment coupon usage
            if (orderData.couponId) {
                await tx.coupon.update({
                    where: { id: orderData.couponId },
                    data: { totalUsed: { increment: 1 } },
                });

                await tx.couponUsage.create({
                    data: {
                        couponId: orderData.couponId,
                        userId: userId,
                        orderId: order.id,
                    }
                });
            }

            return order;
        });
    }

    /**
     * Find order by ID
     */
    async findById(id) {
        return prisma.order.findUnique({
            where: { id },
            select: {
                id: true,
                orderNumber: true,
                customerId: true,
                deliveryPersonId: true,
                status: true,
                totalAmount: true,
                subtotal: true,
                deliveryFee: true,
                discountAmount: true,
                createdAt: true,
                estimatedDeliveryAt: true,
                acceptedAt: true,
                preparedAt: true,
                pickedUpAt: true,
                deliveredAt: true,
                orderItems: {
                    select: {
                        id: true,
                        itemName: true,
                        itemPrice: true,
                        quantity: true,
                        subtotal: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        ownerId: true,
                        name: true,
                        phone: true,
                        addressLine1: true,
                        latitude: true,
                        longitude: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                deliveryAddress: true,
                deliveryPerson: {
                    select: {
                        id: true,
                        status: true,
                        currentLatitude: true,
                        currentLongitude: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phone: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                payment: {
                    select: {
                        id: true,
                        status: true,
                        method: true,
                        amount: true,
                    },
                },
                review: true,
            },
        });
    }

    /**
     * Find orders for user with filters
     */
    async findByUserId(userId, { page = 1, limit = 10, status, dateFrom, dateTo } = {}) {
        const where = { customerId: userId };

        if (status) {
            // Mapping for common frontend/API status names to Prisma enum values
            const statusMap = {
                'pending': 'PENDING',
                'confirmed': 'CONFIRMED',
                'preparing': 'PREPARING',
                'ready': 'READY_FOR_PICKUP',
                'picked_up': 'OUT_FOR_DELIVERY',
                'delivering': 'OUT_FOR_DELIVERY',
                'delivered': 'DELIVERED',
                'cancelled': 'CANCELLED',
                'refunded': 'REFUNDED'
            };

            // Handle comma-separated string or array
            const statusList = typeof status === 'string' ? status.split(',') : (Array.isArray(status) ? status : [status]);

            // Normalize and map statuses, removing duplicates
            const mappedStatuses = [...new Set(statusList.map(s => {
                const normalized = s.toString().toLowerCase().trim();
                return statusMap[normalized] || normalized.toUpperCase();
            }))];

            if (mappedStatuses.length === 1) {
                where.status = mappedStatuses[0];
            } else if (mappedStatuses.length > 1) {
                where.status = { in: mappedStatuses };
            }
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) { where.createdAt.gte = new Date(dateFrom); }
            if (dateTo) { where.createdAt.lte = new Date(dateTo); }
        }

        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    restaurant: {
                        select: { name: true, logoUrl: true },
                    },
                    orderItems: {
                        select: { itemName: true, quantity: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.order.count({ where }),
        ]);

        return { orders, total };
    }

    /**
     * Get active orders for a user
     */
    async findActiveByUserId(userId) {
        return prisma.order.findMany({
            where: {
                customerId: userId,
                status: {
                    in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
                },
            },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
                createdAt: true,
                restaurant: {
                    select: { name: true, logoUrl: true, id: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Update order status and related timestamps
     */
    async updateStatus(id, status, extraData = {}) {
        const data = { status, ...extraData };

        // Automatically set timestamps based on status
        if (status === 'CONFIRMED') { data.acceptedAt = new Date(); }
        if (status === 'PREPARING') { data.preparedAt = new Date(); } // Wait, PREPARING is usually start of prep. READY is when done.
        if (status === 'READY_FOR_PICKUP') { data.preparedAt = new Date(); }
        if (status === 'OUT_FOR_DELIVERY') { data.pickedUpAt = new Date(); }
        if (status === 'DELIVERED') { data.deliveredAt = new Date(); }
        if (status === 'CANCELLED') { data.cancelledAt = new Date(); }

        return prisma.order.update({
            where: { id },
            data,
        });
    }

    /**
     * Get user order stats
     */
    async getUserStats(userId) {
        const stats = await prisma.order.groupBy({
            by: ['status'],
            where: { customerId: userId },
            _count: { _all: true },
            _sum: { totalAmount: true },
        });

        const totalSpent = await prisma.order.aggregate({
            where: {
                customerId: userId,
                status: 'DELIVERED'
            },
            _sum: { totalAmount: true },
        });

        return {
            statusCounts: stats,
            totalSpent: totalSpent._sum.totalAmount || 0,
        };
    }

    /**
     * Check if user has already reviewed an order
     */
    async hasReview(orderId) {
        const review = await prisma.review.findUnique({
            where: { orderId },
        });
        return !!review;
    }

    /**
     * Create order review
     */
    async createReview(reviewData) {
        return prisma.review.create({
            data: reviewData,
        });
    }

    /**
     * Get total count of orders for generating order number
     */
    async countTodayOrders() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return prisma.order.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                },
            },
        });
    }
}

module.exports = new OrderRepository();
