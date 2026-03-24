const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const notificationController = require('../../controllers/notification.controller');

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/notifications
 * @desc Fetch user notifications
 * @access Private
 */
router.get('/', notificationController.getNotifications);

/**
 * @route PUT /api/v1/notifications/preferences
 * @desc Update notification preferences
 * @access Private
 */
router.put('/preferences', notificationController.updatePreferences);

/**
 * @route PUT /api/v1/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @route PUT /api/v1/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.put('/:id/read', notificationController.markAsRead);

/**
 * @route DELETE /api/v1/notifications/:id
 * @desc Delete notification
 * @access Private
 */
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
