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
const { upload } = require('../../middlewares/upload.middleware');
const riderValidator = require('../../validators/rider.validator');

// Public routes
// Caching for all GET endpoints is handled inside the service layer.
router.get('/',
  validate(restaurantValidator.searchRestaurants),
  restaurantController.getRestaurants,
);

router.get('/nearby',
  validate(restaurantValidator.searchRestaurants),
  restaurantController.getNearbyRestaurants,
);

router.get('/featured',
  restaurantController.getFeaturedRestaurants,
);

router.get('/search',
  validate(restaurantValidator.searchRestaurants),
  restaurantController.searchRestaurants,
);

router.get('/profile',
  authenticate,
  authorize('RESTAURANT_OWNER', 'ADMIN'),
  restaurantController.getRestaurantProfile,
);

router.put('/profile',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  validate(restaurantValidator.updateRestaurant),
  restaurantController.updateMyRestaurantProfile,
);

router.put('/status',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(restaurantValidator.updateStatus),
  restaurantController.updateMyRestaurantStatus,
);

router.get('/:id',
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

// Rider Management (for restaurant owners)
router.get('/my/riders',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  restaurantController.getMyRiders
);

router.post('/my/riders',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(riderValidator.registerRider),
  restaurantController.registerRider
);

router.post('/orders/:orderId/assign',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  restaurantController.assignRiderToOrder
);

module.exports = router;
