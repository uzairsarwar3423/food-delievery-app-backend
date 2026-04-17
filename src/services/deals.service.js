/**
 * src/services/deals.service.js
 * Deals business logic
 */

const dealRepository = require('../repositories/deal.repository');
const ApiError = require('../utils/ApiError');
const { validateDealEligibility, calculateDiscount } = require('../utils/dealCalculator');
const { getPaginationParams, buildPaginationMeta } = require('../utils/helpers');

class DealsService {
  /**
   * Get all deals with filtering and pagination
   */
  async getDeals(query, userId = null) {
    const { page, limit, featured, restaurantId, sortBy } = query;
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);

    const where = { isActive: true };

    if (featured !== undefined) {
      where.isFeatured = featured;
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'ending_soon') {
      orderBy = { validUntil: 'asc' };
    } else if (sortBy === 'popular') {
      orderBy = { usages: { _count: 'desc' } };
    }

    const { deals, total } = await dealRepository.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        restaurant: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    // Enrich with favorite status if user is logged in
    let enrichedDeals = deals;
    if (userId) {
      enrichedDeals = await Promise.all(
        deals.map(async (deal) => ({
          ...deal,
          isFavorited: await dealRepository.isFavorited(userId, deal.id),
        })),
      );
    }

    const pagination = buildPaginationMeta(total, currentPage, currentLimit);
    return { deals: enrichedDeals, pagination };
  }

  /**
   * Get featured deals for home page
   */
  async getFeaturedDeals(userId = null) {
    const { deals } = await dealRepository.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { displayOrder: 'asc' },
      take: 10,
      include: {
        restaurant: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    if (userId) {
      return await Promise.all(
        deals.map(async (deal) => ({
          ...deal,
          isFavorited: await dealRepository.isFavorited(userId, deal.id),
        })),
      );
    }

    return deals;
  }

  /**
   * Get deal by ID with detail and user usage status
   */
  async getDealById(id, userId = null) {
    const deal = await dealRepository.findById(id, {
      restaurant: {
        select: { id: true, name: true, logoUrl: true, rating: true, averageRating: true },
      },
      campaign: true,
    });

    if (!deal) {
      throw new ApiError(404, 'Deal not found');
    }

    let userUsageCount = 0;
    let isFavorited = false;

    if (userId) {
      userUsageCount = await dealRepository.getUsageCount(userId, id);
      isFavorited = await dealRepository.isFavorited(userId, id);
    }

    return {
      ...deal,
      isFavorited,
      userUsageStatus: {
        usedCount: userUsageCount,
        usageRemaining: Math.max(0, deal.usageLimitPerUser - userUsageCount),
      },
    };
  }

  /**
   * Validate and calculate discount for a deal application
   */
  async applyDeal(id, cartData, userId) {
    const deal = await dealRepository.findById(id);
    if (!deal) {
      throw new ApiError(404, 'Deal not found');
    }

    const userUsageCount = await dealRepository.getUsageCount(userId, id);
    const validation = validateDealEligibility(deal, cartData, userUsageCount);

    if (!validation.isValid) {
      throw new ApiError(400, validation.error);
    }

    const discountAmount = calculateDiscount(deal, cartData.subtotal);

    return {
      dealId: deal.id,
      dealName: deal.title,
      discountAmount,
      type: deal.type,
      value: deal.value,
    };
  }

  /**
   * Get active deals for a specific restaurant
   */
  async getRestaurantDeals(restaurantId, userId = null) {
    const { deals } = await dealRepository.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { validUntil: 'asc' },
    });

    if (userId) {
      return await Promise.all(
        deals.map(async (deal) => {
          const userUsageCount = await dealRepository.getUsageCount(userId, deal.id);
          const isFavorited = await dealRepository.isFavorited(userId, deal.id);
          const eligibility = validateDealEligibility(deal, { restaurantId }, userUsageCount);

          return {
            ...deal,
            isFavorited,
            isEligible: eligibility.isValid,
            ineligibilityReason: eligibility.error,
          };
        }),
      );
    }

    return deals;
  }

  /**
   * Get user's deal usage history
   */
  async getMyUsageHistory(userId, query) {
    const { page, limit } = query;
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);

    const { usages, total, totalSavings } = await dealRepository.findUsageByUserId(userId, { skip, take });

    const pagination = buildPaginationMeta(total, currentPage, currentLimit);
    return { usages, totalSavings, pagination };
  }

  /**
   * Toggle deal favorite status
   */
  async toggleFavorite(id, userId) {
    const deal = await dealRepository.findById(id);
    if (!deal) {
      throw new ApiError(404, 'Deal not found');
    }

    return await dealRepository.toggleFavorite(userId, id);
  }
}

module.exports = new DealsService();
