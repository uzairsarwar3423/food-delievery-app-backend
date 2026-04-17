/**
 * src/controllers/deals.controller.js
 * Deals controller
 */

const dealsService = require('../services/deals.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc Get all active deals with filters
 */
const getDeals = asyncHandler(async (req, res) => {
  const result = await dealsService.getDeals(req.query, req.user?.id);
  return ApiResponse.paginated(res, result.deals, result.pagination, 'Deals fetched successfully');
});

/**
 * @desc Get featured deals for home screen
 */
const getFeaturedDeals = asyncHandler(async (req, res) => {
  const deals = await dealsService.getFeaturedDeals(req.user?.id);
  return ApiResponse.success(res, deals, 'Featured deals fetched successfully');
});

/**
 * @desc Get single deal detail
 */
const getDealById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deal = await dealsService.getDealById(id, req.user?.id);
  return ApiResponse.success(res, deal, 'Deal details fetched successfully');
});

/**
 * @desc Validate and apply deal to cart
 */
const applyDeal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cartData } = req.body;
  const result = await dealsService.applyDeal(id, cartData, req.user.id);
  return ApiResponse.success(res, result, 'Deal applied successfully');
});

/**
 * @desc Get deals for a specific restaurant
 */
const getRestaurantDeals = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const deals = await dealsService.getRestaurantDeals(restaurantId, req.user?.id);
  return ApiResponse.success(res, deals, 'Restaurant deals fetched successfully');
});

/**
 * @desc Get current user's deal usage history
 */
const getMyUsageHistory = asyncHandler(async (req, res) => {
  const result = await dealsService.getMyUsageHistory(req.user.id, req.query);
  return ApiResponse.paginated(
    res,
    result.usages,
    {
      ...result.pagination,
      totalSavings: result.totalSavings,
    },
    'Usage history fetched successfully',
  );
});

/**
 * @desc Toggle deal favorite status
 */
const toggleFavorite = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await dealsService.toggleFavorite(id, req.user.id);
  const message = result.favorited ? 'Added to favorites' : 'Removed from favorites';
  return ApiResponse.success(res, result, message);
});

module.exports = {
  getDeals,
  getFeaturedDeals,
  getDealById,
  applyDeal,
  getRestaurantDeals,
  getMyUsageHistory,
  toggleFavorite,
};
