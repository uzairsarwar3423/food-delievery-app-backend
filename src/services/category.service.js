/**
 * src/services/category.service.js
 * Category Business Logic
 */

const categoryRepository = require('../repositories/category.repository');
const cacheService = require('./cache.service');
const uploadService = require('./upload.service');
const ApiError = require('../utils/ApiError');
const { slugify } = require('../utils/helpers');

class CategoryService {
  /**
     * Get all active categories
     */
  async getCategories() {
    return categoryRepository.findMany();
  }

  /**
     * Get category by ID
     */
  async getCategoryById(id) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    return category;
  }

  /**
     * Create category (Admin only)
     */
  async createCategory(data, file = null) {
    const { name } = data;
    let slug = slugify(name);

    // Check slug uniqueness
    const existing = await categoryRepository.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    const createData = {
      ...data,
      slug,
      displayOrder: parseInt(data.displayOrder || 0, 10),
      isActive: true,
    };

    if (file) {
      const result = await uploadService.uploadImage(file.path, 'categories');
      createData.imageUrl = result.secure_url;
    }

    const category = await categoryRepository.create(createData);

    // Invalidate cache
    await cacheService.clearCategoryCache();

    return category;
  }

  /**
     * Update category (Admin only)
     */
  async updateCategory(id, updateData, file = null) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const data = { ...updateData };
    if (data.displayOrder) {data.displayOrder = parseInt(data.displayOrder, 10);}

    if (file) {
      const result = await uploadService.uploadImage(file.path, 'categories');
      data.imageUrl = result.secure_url;
    }

    const updated = await categoryRepository.update(id, data);

    // Invalidate cache
    await cacheService.clearCategoryCache();

    return updated;
  }

  /**
     * Delete category (Admin only)
     */
  async deleteCategory(id) {
    const hasItems = await categoryRepository.hasMenuItems(id);
    if (hasItems) {
      throw new ApiError(400, 'Cannot delete category that has menu items');
    }

    await categoryRepository.delete(id);
    await cacheService.clearCategoryCache();

    return { message: 'Category deleted successfully' };
  }

  /**
     * Reorder categories
     */
  async reorderCategories(categories) {
    await categoryRepository.updateDisplayOrders(categories);
    await cacheService.clearCategoryCache();
    return { message: 'Categories reordered successfully' };
  }
}

module.exports = new CategoryService();
