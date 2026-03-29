/**
 * src/controllers/category.controller.js
 * Category Endpoints Controller
 */

const categoryService = require('../services/category.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const cacheService = require('../services/cache.service');
const logger = require('../config/logger');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getCategories();
  return ApiResponse.success(res, categories, 'Categories fetched successfully');
});

const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await categoryService.getCategoryById(id);
  return ApiResponse.success(res, category, 'Category fetched successfully');
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body, req.file);

  // Invalidate cache
  await cacheService.clearCategoryCache();

  return ApiResponse.created(res, category, 'Category created successfully');
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await categoryService.updateCategory(id, req.body, req.file);

  // Invalidate cache
  await cacheService.clearCategoryCache();

  return ApiResponse.success(res, category, 'Category updated successfully');
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await categoryService.deleteCategory(id);

  // Invalidate cache
  await cacheService.clearCategoryCache();

  return ApiResponse.success(res, null, result.message);
});

const reorderCategories = asyncHandler(async (req, res) => {
  const { categories } = req.body;
  if (!Array.isArray(categories)) {
    throw new ApiError(400, 'Categories must be an array of objects containing id and displayOrder');
  }
  const result = await categoryService.reorderCategories(categories);

  // Invalidate cache
  await cacheService.clearCategoryCache();

  return ApiResponse.success(res, null, result.message);
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
};
