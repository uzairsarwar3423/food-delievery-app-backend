// =============================================================
// src/services/user.service.js — User Business Logic
// =============================================================

const userRepository = require('../repositories/user.repository');
const uploadService = require('./upload.service');
const { cacheDel } = require('../config/redis');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

class UserService {
  /**
     * Get user profile with addresses
     * @param {string} userId
     * @returns {Promise<Object>}
     */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Exclude password hash
    const { passwordHash, ...profile } = user;
    return profile;
  }

  /**
     * Update user profile
     * @param {string} userId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
  async updateProfile(userId, updateData) {
    // Validate phone uniqueness if provided
    if (updateData.phone) {
      const existingUser = await userRepository.findByPhone(updateData.phone);
      if (existingUser && existingUser.id !== userId) {
        throw new ApiError(400, 'Phone number already in use by another user');
      }
    }

    const updatedUser = await userRepository.update(userId, updateData);
    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    // Clear user cache in Redis
    await cacheDel(`user:profile:${userId}`);

    // Exclude password hash
    const { passwordHash, ...profile } = updatedUser;
    return profile;
  }

  /**
     * Upload user avatar
     * @param {string} userId
     * @param {string} filePath
     */
  async uploadAvatar(userId, filePath) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const uploadResult = await uploadService.uploadImage(filePath, 'users/avatars');
    const avatarUrl = uploadResult.secure_url;

    // Delete old avatar from Cloudinary if exists
    if (user.avatarUrl) {
      const oldPublicId = uploadService.getPublicIdFromUrl(user.avatarUrl);
      if (oldPublicId) {
        await uploadService.deleteImage(oldPublicId);
      }
    }

    await userRepository.update(userId, { avatarUrl });

    // Clear user cache in Redis
    await cacheDel(`user:profile:${userId}`);

    return avatarUrl;
  }

  /**
     * Delete user avatar
     * @param {string} userId
     */
  async deleteAvatar(userId) {
    const user = await userRepository.findById(userId);
    if (!user || !user.avatarUrl) {
      throw new ApiError(404, 'Avatar not found');
    }

    const publicId = uploadService.getPublicIdFromUrl(user.avatarUrl);
    if (publicId) {
      await uploadService.deleteImage(publicId);
    }

    await userRepository.update(userId, { avatarUrl: null });

    // Clear user cache in Redis
    await cacheDel(`user:profile:${userId}`);

    return { message: 'Avatar deleted successfully' };
  }

  /**
     * Get user addresses
     * @param {string} userId
     */
  async getAddresses(userId) {
    return userRepository.findAddressesByUserId(userId);
  }

  /**
     * Add new address
     * @param {string} userId
     * @param {Object} addressData
     */
  async addAddress(userId, addressData) {
    const { fullAddress, ...rest } = addressData;

    // Map fullAddress to addressLine1 and handle postalCode
    const finalAddressData = {
      ...rest,
      addressLine1: fullAddress,
      postalCode: addressData.postalCode || '00000',
      userId,
    };

    // Handle default address logic
    if (finalAddressData.isDefault) {
      await userRepository.clearDefaultAddresses(userId);
    } else {
      // If no addresses exist, make this one default
      const addresses = await userRepository.findAddressesByUserId(userId);
      if (addresses.length === 0) {
        finalAddressData.isDefault = true;
      }
    }

    return userRepository.createAddress(finalAddressData);
  }

  /**
     * Get address by ID
     * @param {string} userId
     * @param {string} addressId
     */
  async getAddressById(userId, addressId) {
    const address = await userRepository.findAddressById(addressId, userId);
    if (!address) {
      throw new ApiError(404, 'Address not found or unauthorized');
    }
    return address;
  }

  /**
     * Update address
     * @param {string} userId
     * @param {string} addressId
     * @param {Object} updateData
     */
  async updateAddress(userId, addressId, updateData) {
    const address = await userRepository.findAddressById(addressId, userId);
    if (!address) {
      throw new ApiError(404, 'Address not found or unauthorized');
    }

    const { fullAddress, ...rest } = updateData;
    const finalUpdateData = { ...rest };
    if (fullAddress) {finalUpdateData.addressLine1 = fullAddress;}

    // Handle default address logic
    if (finalUpdateData.isDefault && !address.isDefault) {
      await userRepository.clearDefaultAddresses(userId);
    }

    return userRepository.updateAddress(addressId, finalUpdateData);
  }

  /**
     * Delete address
     * @param {string} userId
     * @param {string} addressId
     */
  async deleteAddress(userId, addressId) {
    const address = await userRepository.findAddressById(addressId, userId);
    if (!address) {
      throw new ApiError(404, 'Address not found or unauthorized');
    }

    // Check if address is being used in any active orders
    const isUsed = await userRepository.isAddressInActiveOrders(addressId);
    if (isUsed) {
      throw new ApiError(400, 'Cannot delete address while it has active orders');
    }

    await userRepository.deleteAddress(addressId);

    // If it was default, set another address as default
    if (address.isDefault) {
      await userRepository.setDefaultToFirstAvailable(userId);
    }

    return { message: 'Address deleted successfully' };
  }

  /**
     * Set specific address as default
     * @param {string} userId
     * @param {string} addressId
     */
  async setAddressAsDefault(userId, addressId) {
    const address = await userRepository.findAddressById(addressId, userId);
    if (!address) {
      throw new ApiError(404, 'Address not found or unauthorized');
    }

    await userRepository.clearDefaultAddresses(userId);
    return userRepository.setAddressAsDefault(addressId);
  }

  /**
     * Get favorites
     * @param {string} userId
     */
  async getFavorites(userId) {
    return userRepository.getFavorites(userId);
  }

  /**
     * Toggle favorite
     * @param {string} userId
     * @param {string} restaurantId
     */
  async toggleFavorite(userId, restaurantId) {
    const existing = await userRepository.findFavorite(userId, restaurantId);
    if (existing) {
      await userRepository.removeFavorite(userId, restaurantId);
      return { isFavorite: false };
    } else {
      await userRepository.addFavorite(userId, restaurantId);
      return { isFavorite: true };
    }
  }
}

module.exports = new UserService();
