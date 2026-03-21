/**
 * src/repositories/category.repository.js
 * Category Data Access Layer
 */

const { prisma } = require('../config/database');

class CategoryRepository {
  /**
     * Find all active categories
     */
  async findMany({ where = { isActive: true }, orderBy = { displayOrder: 'asc' } } = {}) {
    return prisma.category.findMany({ where, orderBy });
  }

  /**
     * Find category by ID
     */
  async findById(id) {
    return prisma.category.findUnique({ where: { id } });
  }

  /**
     * Find category by slug
     */
  async findBySlug(slug) {
    return prisma.category.findUnique({ where: { slug } });
  }

  /**
     * Create category
     */
  async create(data) {
    return prisma.category.create({ data });
  }

  /**
     * Update category
     */
  async update(id, data) {
    return prisma.category.update({ where: { id }, data });
  }

  /**
     * Delete category
     */
  async delete(id) {
    return prisma.category.delete({ where: { id } });
  }

  /**
     * Check if category has menu items
     */
  async hasMenuItems(categoryId) {
    const item = await prisma.menuItem.findFirst({
      where: { categoryId },
    });
    return !!item;
  }

  /**
     * Batch update display orders
     */
  async updateDisplayOrders(categories) {
    const updates = categories.map(({ id, displayOrder }) =>
      prisma.category.update({
        where: { id },
        data: { displayOrder },
      }),
    );
    return prisma.$transaction(updates);
  }
}

module.exports = new CategoryRepository();
