const menuService = require('../services/menu.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const cacheService = require('../services/cache.service');

/**
 * GET /restaurants/:restaurantId/menu
 * Cache is handled entirely by menu.service.getRestaurantMenu (TTL: 30 min).
 * No duplicate caching here.
 */
const getRestaurantMenu = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const menu = await menuService.getRestaurantMenu(restaurantId, req.query);
  return ApiResponse.success(res, menu, 'Menu fetched successfully');
});

/**
 * GET /menu/:id
 * Cache is handled entirely by menu.service.getMenuItem (TTL: 1 h).
 * No duplicate caching here.
 */
const getMenuItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menuItem = await menuService.getMenuItem(id);
  return ApiResponse.success(res, menuItem, 'Menu item fetched successfully');
});

const createMenuItem = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const menuItem = await menuService.createMenuItem(restaurantId, req.user.id, req.body, req.file);

  // Invalidation is performed inside menuService.createMenuItem — nothing to do here.
  return ApiResponse.created(res, menuItem, 'Menu item created successfully');
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menuItem = await menuService.updateMenuItem(id, req.user.id, req.body, req.file);

  // Invalidation is performed inside menuService.updateMenuItem — nothing to do here.
  return ApiResponse.success(res, menuItem, 'Menu item updated successfully');
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await menuService.deleteMenuItem(id, req.user.id);

  // Invalidation is performed inside menuService.deleteMenuItem — nothing to do here.
  return ApiResponse.success(res, null, result.message);
});

const updateAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await menuService.updateAvailability(id, req.user.id, req.body.isAvailable);

  // Invalidation is performed inside menuService.updateAvailability — nothing to do here.
  return ApiResponse.success(res, result, 'Availability updated successfully');
});

const updateImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    throw new ApiError(400, 'Please provide an image file');
  }
  const result = await menuService.updateImage(id, req.user.id, req.file);
  return ApiResponse.success(res, result, 'Image updated successfully');
});

const bulkUpdateAvailability = asyncHandler(async (req, res) => {
  const result = await menuService.bulkUpdateAvailability(req.user.id, req.body);
  return ApiResponse.success(res, result, 'Bulk availability updated successfully');
});

const updatePrice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menuItem = await menuService.updatePrice(id, req.user.id, req.body);

  // Invalidation is performed inside menuService.updatePrice — nothing to do here.
  return ApiResponse.success(res, menuItem, 'Price updated successfully');
});

const importMenu = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  if (!req.file) {
    throw new ApiError(400, 'Please provide a CSV file to import');
  }
  const result = await menuService.importMenu(restaurantId, req.user.id, req.file.path);

  // Cache cleared in background after import completes (backgroundQueue.js)
  return ApiResponse.success(res, result, 'Menu import started successfully');
});

module.exports = {
  getRestaurantMenu,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateAvailability,
  updateImage,
  bulkUpdateAvailability,
  updatePrice,
  importMenu,
};
