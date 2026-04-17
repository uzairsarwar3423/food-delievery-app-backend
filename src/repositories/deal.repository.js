/**
 * src/repositories/deal.repository.js
 * Deal Data Access Layer
 */

const { prisma } = require('../config/database');

class DealRepository {
  /**
   * Find many deals with pagination and filters
   */
  async findMany({ skip, take, where, orderBy, include }) {
    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        skip,
        take,
        where,
        orderBy,
        include,
      }),
      prisma.deal.count({ where }),
    ]);
    return { deals, total };
  }

  /**
   * Find deal by ID with usage count
   */
  async findById(id, include = {}) {
    return prisma.deal.findUnique({
      where: { id },
      include: {
        ...include,
        _count: {
          select: { usages: true },
        },
      },
    });
  }

  /**
   * Get total times a user has used a specific deal
   */
  async getUsageCount(userId, dealId) {
    return prisma.dealUsage.count({
      where: { userId, dealId },
    });
  }

  /**
   * Find user's deal usage history
   */
  async findUsageByUserId(userId, { skip, take } = {}) {
    const [usages, total] = await Promise.all([
      prisma.dealUsage.findMany({
        where: { userId },
        include: {
          deal: true,
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              createdAt: true,
            },
          },
        },
        orderBy: { usedAt: 'desc' },
        skip,
        take,
      }),
      prisma.dealUsage.count({ where: { userId } }),
    ]);

    // Calculate total savings
    const aggregate = await prisma.dealUsage.aggregate({
      where: { userId },
      _sum: { discountAmount: true },
    });

    return {
      usages,
      total,
      totalSavings: aggregate._sum.discountAmount || 0,
    };
  }

  /**
   * Toggle deal favorite status
   */
  async toggleFavorite(userId, dealId) {
    const existing = await prisma.dealFavorite.findUnique({
      where: {
        userId_dealId: { userId, dealId },
      },
    });

    if (existing) {
      await prisma.dealFavorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false };
    }

    await prisma.dealFavorite.create({
      data: { userId, dealId },
    });
    return { favorited: true };
  }

  /**
   * Check if a deal is favorited by a user
   */
  async isFavorited(userId, dealId) {
    if (!userId) return false;
    const favorite = await prisma.dealFavorite.findUnique({
      where: {
        userId_dealId: { userId, dealId },
      },
    });
    return !!favorite;
  }
}

module.exports = new DealRepository();
