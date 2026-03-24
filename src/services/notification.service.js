const notificationRepository = require('../repositories/notification.repository');
const userRepository = require('../repositories/user.repository');
const { sendEmail } = require('../utils/mailer');
const notificationEvents = require('../websocket/events/notification.events');
const logger = require('../config/logger');

/**
 * Notification Service
 */
class NotificationService {
    /**
     * Send a notification to a specific user
     * @param {string} userId - ID of the user
     * @param {Object} notificationData - { type, title, body, data }
     * @param {Object} options - { push: true, email: true, sms: true }
     */
    async send(userId, notificationData, options = { push: true, email: true, sms: true }) {
        try {
            // 1. Fetch user to check preferences
            const user = await userRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const preferences = user.notificationPreferences || { email: true, push: true, sms: true };

            // 2. Create in-app notification (always create if push is true or user needs it)
            const inAppNotification = await notificationRepository.create({
                userId,
                type: notificationData.type,
                title: notificationData.title,
                body: notificationData.body,
                data: notificationData.data,
            });

            // 3. Send via selected channels based on user preferences and options
            const promises = [];

            // Email
            if (options.email && preferences.email) {
                promises.push(
                    sendEmail({
                        to: user.email,
                        subject: notificationData.title,
                        html: `<p>${notificationData.body}</p>`,
                    })
                );
            }

            // Push (Placeholder Implementation)
            if (options.push && preferences.push) {
                promises.push(this.sendPushNotification(userId, notificationData));
            }

            // SMS (Placeholder Implementation)
            if (options.sms && preferences.sms) {
                promises.push(this.sendSMSNotification(user.phone, notificationData));
            }

            await Promise.allSettled(promises);

            // 4. Send via WebSocket (Real-time in-app notification)
            notificationEvents.emitNotificationNew(userId, inAppNotification);

            return inAppNotification;
        } catch (err) {
            logger.error(`Failed to send notification to user ${userId}:`, err.message);
            throw err;
        }
    }

    /**
     * Placeholder for Push Notification service (e.g., Firebase Cloud Messaging)
     */
    async sendPushNotification(userId, notificationData) {
        logger.info(`[FCM] Sending push notification to user ${userId}: ${notificationData.title}`);
        // implementation for FCM or similar would go here
        return true;
    }

    /**
     * Placeholder for SMS Notification service (e.g., Twilio)
     */
    async sendSMSNotification(phone, notificationData) {
        if (!phone) { return false; }
        logger.info(`[SMS] Sending SMS to ${phone}: ${notificationData.body}`);
        // implementation for Twilio or similar would go here
        return true;
    }

    /**
     * Get user notifications
     */
    async getNotifications(userId, query) {
        return notificationRepository.findManyByUserId(userId, query);
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id, userId) {
        return notificationRepository.markAsRead(id, userId);
    }

    /**
     * Mark all as read
     */
    async markAllAsRead(userId) {
        return notificationRepository.markAllAsRead(userId);
    }

    /**
     * Delete notification
     */
    async deleteNotification(id, userId) {
        return notificationRepository.delete(id, userId);
    }

    /**
     * Update preferences
     */
    async updatePreferences(userId, preferences) {
        // userRepository should have an update method
        return userRepository.update(userId, {
            notificationPreferences: preferences,
        });
    }
}

module.exports = new NotificationService();
