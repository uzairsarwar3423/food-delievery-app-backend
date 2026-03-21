// =============================================================
// src/repositories/user.repository.js — User Data Access
// =============================================================

const { prisma } = require('../config/database');

class UserRepository {
  /**
     * Fetch user by ID with addresses
     * @param {string} userId
     * @returns {Promise<Object>}
     */
  async findById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });
  }

  /**
     * Find user by phone
     * @param {string} phone
     * @returns {Promise<Object>}
     */
  async findByPhone(phone) {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
     * Update user profile
     * @param {string} userId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
  async update(userId, updateData) {
    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        addresses: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });
  }

  /**
     * Get all addresses for user
     * @param {string} userId
     * @returns {Promise<Array>}
     */
  async findAddressesByUserId(userId) {
    return prisma.userAddress.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
     * Create new address
     * @param {Object} addressData
     * @returns {Promise<Object>}
     */
  async createAddress(addressData) {
    return prisma.userAddress.create({
      data: addressData,
    });
  }

  /**
     * Find address by ID and userId
     * @param {string} addressId
     * @param {string} userId
     * @returns {Promise<Object>}
     */
  async findAddressById(addressId, userId) {
    return prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });
  }

  /**
     * Update address
     * @param {string} addressId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
  async updateAddress(addressId, updateData) {
    return prisma.userAddress.update({
      where: { id: addressId },
      data: updateData,
    });
  }

  /**
     * Delete address
     * @param {string} addressId
     * @returns {Promise<Object>}
     */
  async deleteAddress(addressId) {
    return prisma.userAddress.delete({
      where: { id: addressId },
    });
  }

  /**
     * Set all addresses for user to not default
     * @param {string} userId
     */
  async clearDefaultAddresses(userId) {
    return prisma.userAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  /**
     * Set specific address as default
     * @param {string} addressId
     */
  async setAddressAsDefault(addressId) {
    return prisma.userAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }

  /**
     * Set first available address as default
     * @param {string} userId
     */
  async setDefaultToFirstAvailable(userId) {
    const firstAddress = await prisma.userAddress.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (firstAddress) {
      await prisma.userAddress.update({
        where: { id: firstAddress.id },
        data: { isDefault: true },
      });
    }
  }

  /**
     * Check if address is used in active orders
     * @param {string} addressId
     */
  async isAddressInActiveOrders(addressId) {
    const activeOrders = await prisma.order.findFirst({
      where: {
        deliveryAddressId: addressId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
        },
      },
    });
    return !!activeOrders;
  }

  /**
     * Get user favorites
     * @param {string} userId
     */
  async getFavorites(userId) {
    return prisma.favorite.findMany({
      where: { userId },
      include: {
        restaurant: true,
      },
    });
  }

  /**
     * Check if restaurant is favorited by user
     * @param {string} userId
     * @param {string} restaurantId
     */
  async findFavorite(userId, restaurantId) {
    return prisma.favorite.findUnique({
      where: {
        userId_restaurantId: { userId, restaurantId },
      },
    });
  }

  /**
     * Add to favorites
     * @param {string} userId
     * @param {string} restaurantId
     */
  async addFavorite(userId, restaurantId) {
    return prisma.favorite.create({
      data: { userId, restaurantId },
    });
  }

  /**
     * Remove from favorites
     * @param {string} userId
     * @param {string} restaurantId
     */
  async removeFavorite(userId, restaurantId) {
    return prisma.favorite.delete({
      where: {
        userId_restaurantId: { userId, restaurantId },
      },
    });
  }
}

module.exports = new UserRepository();
