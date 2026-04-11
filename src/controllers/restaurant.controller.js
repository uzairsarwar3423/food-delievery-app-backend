/**
 * src/controllers/restaurant.controller.js
 * Restaurant Endpoints Controller
 */

const restaurantService = require('../services/restaurant.service');
const riderService = require('../services/rider.service');
const deliveryService = require('../services/delivery.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const cacheService = require('../services/cache.service');
const logger = require('../config/logger');

const getRestaurants = asyncHandler(async (req, res) => {
  const cacheKey = cacheService.generateRestaurantKey(req.query);
  const cachedData = await cacheService.get(cacheKey);

  if (cachedData) {
    logger.debug(`Cache hit for ${cacheKey}`);
    return ApiResponse.paginated(res, cachedData.restaurants, cachedData.pagination, 'Restaurants fetched successfully (from cache)');
  }

  const result = await restaurantService.getRestaurants(req.query);
  await cacheService.set(cacheKey, result, 3600); // Cache for 1 hour

  return ApiResponse.paginated(res, result.restaurants, result.pagination, 'Restaurants fetched successfully');
});

const getRestaurantById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userLocation = {
    latitude: req.query.latitude,
    longitude: req.query.longitude,
  };

  const cacheKey = `restaurant:details:${id}:${userLocation.latitude}:${userLocation.longitude}`;
  const cachedData = await cacheService.get(cacheKey);

  if (cachedData) {
    logger.debug(`Cache hit for ${cacheKey}`);
    return ApiResponse.success(res, cachedData, 'Restaurant details fetched successfully (from cache)');
  }

  const restaurant = await restaurantService.getRestaurantById(id, userLocation);
  await cacheService.set(cacheKey, restaurant, 1800); // Cache for 30 mins

  return ApiResponse.success(res, restaurant, 'Restaurant details fetched successfully');
});

const getNearbyRestaurants = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius } = req.query;
  const restaurants = await restaurantService.getNearbyRestaurants(latitude, longitude, radius);
  return ApiResponse.success(res, restaurants, 'Nearby restaurants fetched successfully');
});

const getFeaturedRestaurants = asyncHandler(async (req, res) => {
  const restaurants = await restaurantService.getFeaturedRestaurants();
  return ApiResponse.success(res, restaurants, 'Featured restaurants fetched successfully');
});

const createRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.createRestaurant(req.user.id, req.body, req.files);
  return ApiResponse.created(res, restaurant, 'Restaurant created successfully and pending approval');
});

const updateRestaurant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';
  const restaurant = await restaurantService.updateRestaurant(id, req.user.id, req.body, req.files, isAdmin);

  // Invalidate cache
  await cacheService.clearRestaurantCache();
  await cacheService.del(`restaurant:details:${id}:*`);

  return ApiResponse.success(res, restaurant, 'Restaurant updated successfully');
});

const deleteRestaurant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';
  const result = await restaurantService.deleteRestaurant(id, req.user.id, isAdmin);

  // Invalidate cache
  await cacheService.clearRestaurantCache();
  await cacheService.del(`restaurant:details:${id}:*`);

  return ApiResponse.success(res, null, result.message);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const status = await restaurantService.updateStatus(id, req.user.id, req.body.isOpen);

  // Invalidate cache
  await cacheService.clearRestaurantCache();
  await cacheService.del(`restaurant:details:${id}:*`);

  return ApiResponse.success(res, status, 'Restaurant status updated successfully');
});

const updateMyRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantProfile(req.user.id);
  const status = await restaurantService.updateStatus(restaurant.id, req.user.id, req.body.isOpen);

  // Invalidate cache
  await cacheService.clearRestaurantCache();
  await cacheService.del(`restaurant:details:${restaurant.id}:*`);

  return ApiResponse.success(res, status, 'Restaurant status updated successfully');
});

const updateMyRestaurantProfile = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.updateRestaurantProfile(req.user.id, req.body, req.files);

  // Invalidate cache
  await cacheService.clearRestaurantCache();
  await cacheService.del(`restaurant:details:${restaurant.id}:*`);

  return ApiResponse.success(res, restaurant, 'Restaurant profile updated successfully');
});

const uploadImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'Please provide images to upload');
  }
  const imageUrls = await restaurantService.addImages(id, req.user.id, req.files);
  return ApiResponse.success(res, { imageUrls }, 'Images uploaded successfully');
});

const searchRestaurants = asyncHandler(async (req, res) => {
  const { q, ...filters } = req.query;
  const restaurants = await restaurantService.searchRestaurants(q, filters);
  return ApiResponse.success(res, restaurants, 'Search completed successfully');
});

const getRestaurantProfile = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantProfile(req.user.id);
  return ApiResponse.success(res, restaurant, 'Restaurant profile fetched successfully');
});

const getMyRiders = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantProfile(req.user.id);
  const riders = await riderService.getRidersByRestaurant(restaurant.id);
  return ApiResponse.success(res, riders, 'Riders fetched successfully');
});

const registerRider = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantProfile(req.user.id);
  const result = await riderService.registerRestaurantRider(restaurant.id, req.body);
  return ApiResponse.created(res, result, 'Rider registered successfully');
});

const assignRiderToOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { riderId } = req.body;
  const result = await deliveryService.assignRiderToOrder(req.user.id, orderId, riderId);
  return ApiResponse.success(res, result, 'Rider assigned to order successfully');
});

module.exports = {
  getRestaurants,
  getRestaurantById,
  getNearbyRestaurants,
  getFeaturedRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  updateStatus,
  uploadImages,
  searchRestaurants,
  getRestaurantProfile,
  updateMyRestaurantStatus,
  updateMyRestaurantProfile,
  getMyRiders,
  registerRider,
  assignRiderToOrder,
};
