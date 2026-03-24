/**
 * src/controllers/notification.controller.js
 * Notification Controller
 */

const notificationService = require('../services/notification.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.getNotifications(req.user.id, req.query);
    return ApiResponse.success(res, result.notifications, 'Notifications fetched');
});

const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await notificationService.markAsRead(id, req.user.id);
    return ApiResponse.success(res, result, 'Notification marked as read');
});

const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await notificationService.markAllAsRead(userId);
    return ApiResponse.success(res, null, 'All notifications marked as read');
});

const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await notificationService.deleteNotification(id, req.user.id);
    return ApiResponse.noContent(res);
});

const updatePreferences = asyncHandler(async (req, res) => {
    const result = await notificationService.updatePreferences(req.user.id, req.body);
    return ApiResponse.success(res, result.notificationPreferences, 'Notification preferences updated');
});

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
};
