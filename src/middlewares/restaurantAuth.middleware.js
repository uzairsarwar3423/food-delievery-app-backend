/**
 * src/middlewares/restaurantAuth.middleware.js
 * Middleware to extract restaurantId for Restaurant Owners
 */

const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../utils/constants');

/**
 * Ensures user is a restaurant owner and attaches their restaurantId to req
 */
const restaurantAuth = asyncHandler(async (req, res, next) => {
    if (req.user.role !== ROLES.RESTAURANT_OWNER && req.user.role !== ROLES.ADMIN) {
        throw ApiError.forbidden('Only restaurant owners or admins can access this resource');
    }

    // Find the restaurant owned by this user
    // For multi-tenant, we assume the owner is working on their primary restaurant
    const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId: req.user.id },
        select: { id: true },
    });

    if (!restaurant) {
        throw ApiError.notFound('No restaurant found for this user');
    }

    req.restaurantId = restaurant.id;
    next();
});

module.exports = restaurantAuth;
