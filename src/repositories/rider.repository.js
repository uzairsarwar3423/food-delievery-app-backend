// =============================================================
// src/repositories/rider.repository.js — Rider Data Access
// =============================================================

const { prisma } = require('../config/database');

class RiderRepository {
    /**
       * Create User and DeliveryPerson in a transaction
       */
    async createRider(userData, riderData) {
        // Defensive: strip any User-model fields that must never reach DeliveryPerson.
        // This guards against callers accidentally passing firstName/lastName/etc.
        const USER_ONLY_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'password', 'passwordHash', 'fullName', 'role'];
        const safeRiderData = Object.fromEntries(
            Object.entries(riderData).filter(([key]) => !USER_ONLY_FIELDS.includes(key))
        );

        return prisma.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    ...userData,
                    role: 'DELIVERY_PERSON',
                },
            });

            // 2. Create DeliveryPerson record
            const deliveryPerson = await tx.deliveryPerson.create({
                data: {
                    userId: user.id,
                    ...safeRiderData,
                    status: 'OFFLINE',
                },
            });

            return { user, deliveryPerson };
        });
    }

    /**
       * Find rider by userId
       */
    async findByUserId(userId) {
        return prisma.deliveryPerson.findUnique({
            where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        restaurant: true,
        documents: true,
      },
        });
    }

    /**
       * Update delivery person record
       */
    async update(riderId, updateData) {
        return prisma.deliveryPerson.update({
            where: { id: riderId },
            data: updateData,
            include: {
                user: true,
            },
        });
    }

    /**
       * Update document record (upsert based on type)
       */
    async upsertDocument(riderId, documentData) {
        const { documentType, documentUrl } = documentData;

        // Check if document of this type already exists
        const existing = await prisma.riderDocument.findFirst({
            where: {
                deliveryPersonId: riderId,
                documentType,
            },
        });

        if (existing) {
            return prisma.riderDocument.update({
                where: { id: existing.id },
                data: {
                    documentUrl,
                    status: 'PENDING', // Reset to pending for verification
                },
            });
        }

        return prisma.riderDocument.create({
            data: {
                deliveryPersonId: riderId,
                documentType,
                documentUrl,
                status: 'PENDING',
            },
        });
    }

    /**
       * Get all rider documents
       */
    async getDocuments(riderId) {
        return prisma.riderDocument.findMany({
            where: { deliveryPersonId: riderId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
       * Count total deliveries and sum earnings
       */
    async getStats(riderId) {
        const rider = await prisma.deliveryPerson.findUnique({
            where: { id: riderId },
            select: {
                totalDeliveries: true,
                averageRating: true,
                totalEarnings: true,
                acceptanceRate: true,
            },
        });

        // For on-time rate, we'd need more granular tracking
        return {
            totalDeliveries: rider.totalDeliveries,
            totalEarnings: Number(rider.totalEarnings),
            averageRating: Number(rider.averageRating),
            acceptanceRate: Number(rider.acceptanceRate),
            onTimeRate: 95, // Still mocked for now
        };
    }

    /**
       * Get reviews for rider
       */
    async getRatings(riderId, { page = 1, limit = 10 }) {
        const skip = (page - 1) * limit;

        // Delivery ratings are part of Order reviews
        const reviews = await prisma.review.findMany({
            where: {
                order: {
                    deliveryPersonId: riderId,
                },
                deliveryRating: {
                    not: null,
                },
            },
            include: {
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        const total = await prisma.review.count({
            where: {
                order: {
                    deliveryPersonId: riderId,
                },
                deliveryRating: {
                    not: null,
                },
            },
        });

        return { reviews, total };
    }

    /**
       * Check if cnic exists
       */
    async findByCnic(cnicNumber) {
        return prisma.deliveryPerson.findUnique({
            where: { cnicNumber },
        });
    }

    /**
     * Find many riders by restaurantId
     */
    async findManyByRestaurant(restaurantId) {
        return prisma.deliveryPerson.findMany({
            where: { restaurantId },
            include: {
                user: {
                    select: {
                        email: true,
                        phone: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Update document (for admin review)
     */
    async updateDocument(documentId, data) {
        return prisma.riderDocument.update({
            where: { id: documentId },
            data,
        });
    }
}

module.exports = new RiderRepository();
