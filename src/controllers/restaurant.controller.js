/**
 * src/controllers/restaurant.controller.js
 * Restaurant Endpoints Controller
 *
 * Cache strategy: All read-caching is handled by the service layer.
 * Controllers are only responsible for routing and response formatting.
 * Cache invalidation after writes is handled in the service layer too;
 * controllers must NOT duplicate cache read/write logic.
 */

const restaurantService = require('../services/restaurant.service');
const riderService = require('../services/rider.service');
const deliveryService = require('../services/delivery.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * GET /restaurants
 * Cache handled by restaurantService.getRestaurants (TTL: 10 min).
 */
const getRestaurants = asyncHandler(async (req, res) => {
  const result = await restaurantService.getRestaurants(req.query);
  return ApiResponse.paginated(res, result.restaurants, result.pagination, 'Restaurants fetched successfully');
});

/**
 * GET /restaurants/:id
 * Cache handled by restaurantService.getRestaurantById (TTL: 15 min).
 */
const getRestaurantById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userLocation = {
    latitude: req.query.latitude,
    longitude: req.query.longitude,
  };
  const restaurant = await restaurantService.getRestaurantById(id, userLocation);
  return ApiResponse.success(res, restaurant, 'Restaurant details fetched successfully');
});

/**
 * GET /restaurants/nearby
 * Not cached — results are per-user-location and highly variable.
 */
const getNearbyRestaurants = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius } = req.query;
  const restaurants = await restaurantService.getNearbyRestaurants(latitude, longitude, radius);
  return ApiResponse.success(res, restaurants, 'Nearby restaurants fetched successfully');
});

/**
 * GET /restaurants/featured
 * Cache handled by restaurantService.getFeaturedRestaurants (TTL: 30 min).
 */
const getFeaturedRestaurants = asyncHandler(async (req, res) => {
  const restaurants = await restaurantService.getFeaturedRestaurants();
  return ApiResponse.success(res, restaurants, 'Featured restaurants fetched successfully');
});

const createRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.createRestaurant(req.user.id, req.body, req.files);
  // Invalidation handled inside restaurantService.createRestaurant
  return ApiResponse.created(res, restaurant, 'Restaurant created successfully and pending approval');
});

const updateRestaurant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';
  const restaurant = await restaurantService.updateRestaurant(id, req.user.id, req.body, req.files, isAdmin);
  // Invalidation handled inside restaurantService.updateRestaurant
  return ApiResponse.success(res, restaurant, 'Restaurant updated successfully');
});

const deleteRestaurant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';
  const result = await restaurantService.deleteRestaurant(id, req.user.id, isAdmin);
  // Invalidation handled inside restaurantService.deleteRestaurant
  return ApiResponse.success(res, null, result.message);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const status = await restaurantService.updateStatus(id, req.user.id, req.body.isOpen);
  // Invalidation handled inside restaurantService.updateStatus
  return ApiResponse.success(res, status, 'Restaurant status updated successfully');
});

const updateMyRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantProfile(req.user.id);
  const status = await restaurantService.updateStatus(restaurant.id, req.user.id, req.body.isOpen);
  // Invalidation handled inside restaurantService.updateStatus
  return ApiResponse.success(res, status, 'Restaurant status updated successfully');
});

const updateMyRestaurantProfile = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.updateRestaurantProfile(req.user.id, req.body, req.files);
  // Invalidation handled inside restaurantService.updateRestaurant (called via updateRestaurantProfile)
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

/**
 * GET /restaurants/search
 * Not cached — full-text search results are too varied to be useful to cache.
 */
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
