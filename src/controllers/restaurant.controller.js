/**
 * src/controllers/restaurant.controller.js
 * Restaurant Endpoints Controller
 */

const restaurantService = require('../services/restaurant.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const cacheService = require('../services/cache.service');
const logger = require('../config/logger');

const getRestaurants = asyncHandler(async (req, res) => {
  const result = await restaurantService.getRestaurants(req.query);
  return ApiResponse.paginated(res, result.restaurants, result.pagination, 'Restaurants fetched successfully');
});

const getRestaurantById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userLocation = {
    latitude: req.query.latitude,
    longitude: req.query.longitude,
  };

  const restaurant = await restaurantService.getRestaurantById(id, userLocation);
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
  const restaurant = await restaurantService.updateRestaurant(id, req.user.id, req.body, isAdmin);
  return ApiResponse.success(res, restaurant, 'Restaurant updated successfully');
});

const deleteRestaurant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';
  const result = await restaurantService.deleteRestaurant(id, req.user.id, isAdmin);
  return ApiResponse.success(res, null, result.message);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const status = await restaurantService.updateStatus(id, req.user.id, req.body.isOpen);
  return ApiResponse.success(res, status, 'Restaurant status updated successfully');
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
};
