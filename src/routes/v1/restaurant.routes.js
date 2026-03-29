/**
 * src/routes/v1/restaurant.routes.js
 * Restaurant Routes
 */

const express = require('express');
const router = express.Router();
const restaurantController = require('../../controllers/restaurant.controller');
const restaurantValidator = require('../../validators/restaurant.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const cacheMiddleware = require('../../middlewares/cache.middleware');
const { upload } = require('../../middlewares/upload.middleware');

// Public routes
router.get('/',
  validate(restaurantValidator.searchRestaurants),
  cacheMiddleware(900), // 15 min
  restaurantController.getRestaurants,
);

router.get('/nearby',
  validate(restaurantValidator.searchRestaurants),
  cacheMiddleware(600), // 10 min
  restaurantController.getNearbyRestaurants,
);

router.get('/featured',
  cacheMiddleware(3600), // 1 hour
  restaurantController.getFeaturedRestaurants,
);

router.get('/search',
  validate(restaurantValidator.searchRestaurants),
  cacheMiddleware(600), // 10 min
  restaurantController.searchRestaurants,
);

router.get('/profile',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  restaurantController.getRestaurantProfile,
);

router.get('/:id',
  cacheMiddleware(1800), // 30 min
  restaurantController.getRestaurantById,
);

// Protected routes
router.post('/',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  validate(restaurantValidator.createRestaurant),
  restaurantController.createRestaurant,
);

router.put('/:id',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  validate(restaurantValidator.updateRestaurant),
  restaurantController.updateRestaurant,
);

router.delete('/:id',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  restaurantController.deleteRestaurant,
);

router.put('/:id/status',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(restaurantValidator.updateStatus),
  restaurantController.updateStatus,
);

router.post('/:id/images',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  upload.array('images', 5),
  restaurantController.uploadImages,
);

module.exports = router;
