// =============================================================
// src/repositories/delivery.repository.js — Delivery Data Access
// =============================================================

const { prisma } = require('../config/database');

class DeliveryRepository {
    async findOrderById(orderId) {
        return prisma.order.findUnique({
            where: { id: orderId },
            include: {
                restaurant: true,
                deliveryAddress: true,
                customer: true,
                payment: true
            }
        });
    }

    async updateOrder(orderId, data) {
        return prisma.order.update({
            where: { id: orderId },
            data,
            include: {
                restaurant: true,
                deliveryAddress: true
            }
        });
    }

    async findAvailableOrders() {
        return prisma.order.findMany({
            where: {
                status: 'READY_FOR_PICKUP',
                deliveryPersonId: null
            },
            include: {
                restaurant: true,
                deliveryAddress: true
            }
        });
    }

    async createIssue(issueData) {
        return prisma.deliveryIssue.create({
            data: issueData
        });
    }

    async getHistory(riderId, { skip, take, dateFrom, dateTo }) {
        const where = {
            deliveryPersonId: riderId,
            status: 'DELIVERED',
        };

        if (dateFrom || dateTo) {
            where.deliveredAt = {};
            if (dateFrom) where.deliveredAt.gte = new Date(dateFrom);
            if (dateTo) where.deliveredAt.lte = new Date(dateTo);
        }

        const [deliveries, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: { restaurant: true, deliveryAddress: true },
                orderBy: { deliveredAt: 'desc' },
                skip,
                take
            }),
            prisma.order.count({ where })
        ]);

        return { deliveries, total };
    }
}

module.exports = new DeliveryRepository();
