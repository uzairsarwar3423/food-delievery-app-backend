/**
 * src/routes/v1/menu.routes.js
 * Menu Routes
 */

const express = require('express');
const router = express.Router();
const menuController = require('../../controllers/menu.controller');
const menuValidator = require('../../validators/menu.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const cacheMiddleware = require('../../middlewares/cache.middleware');
const { upload } = require('../../middlewares/upload.middleware');

// Public routes
// 1. Get restaurant menu
router.get('/restaurants/:restaurantId/menu',
  cacheMiddleware(1800), // 30 min
  menuController.getRestaurantMenu,
);

// 2. Get menu item by ID
router.get('/menu/:id',
  menuController.getMenuItemById,
);

// Protected routes (Owner only)
// 3. Create menu item
router.post('/restaurants/:restaurantId/menu',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.single('image'),
  validate(menuValidator.createMenuItem),
  menuController.createMenuItem,
);

// Bulk availability
router.put('/menu/bulk-availability',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  validate(menuValidator.bulkAvailability),
  menuController.bulkUpdateAvailability,
);

// 4. Update menu item
router.put('/menu/:id',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.single('image'),
  validate(menuValidator.updateMenuItem),
  menuController.updateMenuItem,
);
// 5. Delete menu item
router.delete('/menu/:id',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  menuController.deleteMenuItem,
);

// 6. Update availability
router.put('/menu/:id/availability',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  validate(menuValidator.updateAvailability),
  menuController.updateAvailability,
);

// 7. Update image
router.post('/menu/:id/image',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.single('image'),
  menuController.updateImage,
);

// 9. Update price
router.put('/menu/:id/price',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  validate(menuValidator.updatePrice),
  menuController.updatePrice,
);

// 10. Import menu
router.post('/restaurants/:restaurantId/menu/import',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.single('file'),
  menuController.importMenu,
);

// Note: I added /restaurants/:restaurantId/ prefix to import to match createMenuItem pattern
// even though prompt said /api/v1/menu/import. If it MUST be /api/v1/menu/import,
// restaurantId would need to be in the body.
router.post('/menu/import',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.single('file'),
  menuController.importMenu,
);

module.exports = router;
