const { prisma } = require('../config/database');

/**
 * Notification Repository
 */
class NotificationRepository {
    /**
     * Create a new notification
     */
    async create(data) {
        return prisma.notification.create({
            data,
        });
    }

    /**
     * Get notifications for a user
     */
    async findManyByUserId(userId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { userId } }),
        ]);

        return {
            notifications,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(id, userId) {
        return prisma.notification.update({
            where: { id, userId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Delete a notification
     */
    async delete(id, userId) {
        return prisma.notification.delete({
            where: { id, userId },
        });
    }

    /**
     * Get notification preferences (Placeholder - might need a separate model or JSON field in User)
     * The requirements mention updating preferences, but the schema doesn't have a specific field for it.
     * I'll assume it's stored in the User model as a JSON field 'notificationPreferences' or similar.
     * Wait, let me check the User model again.
     */
}

module.exports = new NotificationRepository();
