// =============================================================
// src/routes/v1/user.routes.js — User API Routes
// =============================================================

const express = require('express');
const userController = require('../../controllers/user.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { upload } = require('../../middlewares/upload.middleware');
const {
  updateProfileValidator,
  addressValidator,
  updateAddressValidator,
  favoriteValidator,
} = require('../../validators/user.validator');

const router = express.Router();

// Apply auth middleware to all user routes
router.use(authenticate);

// ─── Profile Routes ───────────────────────────────────────────
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileValidator), userController.updateProfile);

// ─── Avatar Routes ────────────────────────────────────────────
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
router.delete('/avatar', userController.deleteAvatar);

// ─── Address Routes ───────────────────────────────────────────
router.get('/addresses', userController.getAddresses);
router.post('/addresses', validate(addressValidator), userController.addAddress);
router.get('/addresses/:id', userController.getAddressById);
router.put('/addresses/:id', validate(updateAddressValidator), userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);
router.put('/addresses/:id/default', userController.setDefaultAddress);

// ─── Favorite Routes ──────────────────────────────────────────
router.get('/favorites', userController.getFavorites);
router.post('/favorites/:restaurantId', validate(favoriteValidator), userController.toggleFavorite);

module.exports = router;
