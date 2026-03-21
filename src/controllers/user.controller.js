// =============================================================
// src/controllers/user.controller.js — User Management Controller
// =============================================================

const userService = require('../services/user.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

class UserController {
  /**
     * @desc Get current user profile
     * @route GET /api/v1/users/profile
     */
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const profile = await userService.getProfile(userId);
    return res.json(new ApiResponse(200, profile, 'Profile fetched successfully'));
  });

  /**
     * @desc Update user profile
     * @route PUT /api/v1/users/profile
     */
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;

    const profile = await userService.updateProfile(userId, { firstName, lastName, phone });
    return res.json(new ApiResponse(200, profile, 'Profile updated successfully'));
  });

  /**
     * @desc Upload user avatar
     * @route POST /api/v1/users/avatar
     */
  uploadAvatar = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    if (!req.file) {
      throw new ApiError(400, 'Please upload an image file');
    }

    const avatarUrl = await userService.uploadAvatar(userId, req.file.path);
    return res.json(new ApiResponse(200, { avatarUrl }, 'Avatar uploaded successfully'));
  });

  /**
     * @desc Delete user avatar
     * @route DELETE /api/v1/users/avatar
     */
  deleteAvatar = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await userService.deleteAvatar(userId);
    return res.json(new ApiResponse(200, result, 'Avatar deleted successfully'));
  });

  /**
     * @desc Get all addresses for user
     * @route GET /api/v1/users/addresses
     */
  getAddresses = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const addresses = await userService.getAddresses(userId);
    return res.json(new ApiResponse(200, addresses, 'Addresses fetched successfully'));
  });

  /**
     * @desc Add new address
     * @route POST /api/v1/users/addresses
     */
  addAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const addressData = req.body;

    const address = await userService.addAddress(userId, addressData);
    return res.status(201).json(new ApiResponse(201, address, 'Address added successfully'));
  });

  /**
     * @desc Get address by ID
     * @route GET /api/v1/users/addresses/:id
     */
  getAddressById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    const address = await userService.getAddressById(userId, addressId);
    return res.json(new ApiResponse(200, address, 'Address fetched successfully'));
  });

  /**
     * @desc Update address
     * @route PUT /api/v1/users/addresses/:id
     */
  updateAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;
    const updateData = req.body;

    const address = await userService.updateAddress(userId, addressId, updateData);
    return res.json(new ApiResponse(200, address, 'Address updated successfully'));
  });

  /**
     * @desc Delete address
     * @route DELETE /api/v1/users/addresses/:id
     */
  deleteAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    const result = await userService.deleteAddress(userId, addressId);
    return res.json(new ApiResponse(200, result, 'Address deleted successfully'));
  });

  /**
     * @desc Set default address
     * @route PUT /api/v1/users/addresses/:id/default
     */
  setDefaultAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    const result = await userService.setAddressAsDefault(userId, addressId);
    return res.json(new ApiResponse(200, result, 'Default address updated successfully'));
  });

  /**
     * @desc Get favorite restaurants
     * @route GET /api/v1/users/favorites
     */
  getFavorites = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const favorites = await userService.getFavorites(userId);
    return res.json(new ApiResponse(200, favorites, 'Favorites fetched successfully'));
  });

  /**
     * @desc Toggle favorite restaurant
     * @route POST /api/v1/users/favorites/:restaurantId
     */
  toggleFavorite = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;

    const result = await userService.toggleFavorite(userId, restaurantId);
    return res.json(new ApiResponse(200, result, 'Favorite toggled successfully'));
  });
}

module.exports = new UserController();
