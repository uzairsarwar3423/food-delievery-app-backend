/**
 * src/routes/v1/category.routes.js
 * Category Routes
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/category.controller');
const categoryValidator = require('../../validators/category.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const cacheMiddleware = require('../../middlewares/cache.middleware');
const { upload } = require('../../middlewares/upload.middleware');

// Public routes
router.get('/',
  cacheMiddleware(86400), // 24 hours
  categoryController.getCategories,
);

router.get('/:id',
  categoryController.getCategoryById,
);

// Protected routes (Admin only)
router.post('/',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.single('imageUrl'),
  validate(categoryValidator.createCategory),
  categoryController.createCategory,
);

router.put('/reorder',
  authenticate,
  authorize('ADMIN'),
  validate(categoryValidator.reorderCategories),
  categoryController.reorderCategories,
);

router.put('/:id',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.single('imageUrl'),
  validate(categoryValidator.updateCategory),
  categoryController.updateCategory,
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  categoryController.deleteCategory,
);

module.exports = router;
