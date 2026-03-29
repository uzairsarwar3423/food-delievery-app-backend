/**
 * src/repositories/menu.repository.js
 * Menu Data Access Layer
 */

const { prisma } = require('../config/database');

class MenuRepository {
  /**
     * Find menu items for a restaurant with filters
     */
  async findByRestaurant(restaurantId, { categoryId, isAvailable, search, skip, take = 50 } = {}) {
    const where = { restaurantId };

    if (isAvailable !== undefined && isAvailable !== 'all') {
      where.isAvailable = (isAvailable === 'true' || isAvailable === true);
    } else if (isAvailable === undefined) {
      // Default to showing only available items for public view
      where.isAvailable = true;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    return prisma.menuItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        price: true,
        discountedPrice: true,
        preparationTime: true,
        categoryId: true,
        isAvailable: true,
        isVegetarian: true,
        spiceLevel: true,
        sortOrder: true,
        averageRating: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take,
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
     * Find menu item by ID
     */
  async findById(id) {
    return prisma.menuItem.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            status: true,
          },
        },
        category: true,
      },
    });
  }

  /**
     * Find menu item by slug and restaurant
     */
  async findBySlug(restaurantId, slug) {
    return prisma.menuItem.findUnique({
      where: {
        restaurantId_slug: { restaurantId, slug },
      },
    });
  }

  /**
     * Create menu item
     */
  async create(data) {
    return prisma.menuItem.create({
      data,
      include: {
        category: true,
      },
    });
  }

  /**
     * Update menu item
     */
  async update(id, data) {
    return prisma.menuItem.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  /**
     * Delete menu item
     */
  async delete(id) {
    return prisma.menuItem.delete({
      where: { id },
    });
  }

  /**
     * Bulk update availability
     */
  async bulkUpdateAvailability(menuItemIds, isAvailable) {
    return prisma.menuItem.updateMany({
      where: {
        id: { in: menuItemIds },
      },
      data: { isAvailable },
    });
  }

  /**
     * Bulk create menu items (for import)
     */
  async bulkCreate(items) {
    return prisma.menuItem.createMany({
      data: items,
      skipDuplicates: true,
    });
  }

  /**
     * Check if menu item is in any active carts or orders
     */
  async isInActiveCartsOrOrders(id) {
    const cartItemCount = await prisma.cartItem.count({
      where: { menuItemId: id },
    });

    if (cartItemCount > 0) { return true; }

    const activeOrderCount = await prisma.order.count({
      where: {
        orderItems: {
          some: { menuItemId: id },
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
        },
      },
    });

    return activeOrderCount > 0;
  }

  /**
     * Get users who have this item in their cart
     */
  async getUsersWithItemInCart(menuItemId) {
    const cartItems = await prisma.cartItem.findMany({
      where: { menuItemId },
      select: { userId: true },
    });
    return cartItems.map((item) => item.userId);
  }
}

module.exports = new MenuRepository();
