/**
 * src/repositories/coupon.repository.js
 * Coupon Data Access Layer
 */

const { prisma } = require('../config/database');

class CouponRepository {
    /**
     * Find coupon by code
     */
    async findByCode(code) {
        return prisma.coupon.findUnique({
            where: { code, isActive: true },
        });
    }

    /**
     * Find coupon by ID
     */
    async findById(id) {
        return prisma.coupon.findUnique({
            where: { id },
        });
    }

    /**
     * Check if user has already used this coupon
     */
    async getUsageCount(userId, couponId) {
        return prisma.couponUsage.count({
            where: { userId, couponId },
        });
    }
}

module.exports = new CouponRepository();
