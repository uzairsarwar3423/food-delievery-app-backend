/**
 * src/jobs/backgroundQueue.js
 * Generic Background Processing with BullMQ
 */

const { Queue, Worker } = require('bullmq');
const logger = require('../config/logger');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { slugify } = require('../utils/helpers');

// BullMQ requires its own ioredis connection — it cannot share the cache client.
// REDIS_QUEUE_DB separates queue data from cache data (defaults to DB 1).
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_QUEUE_DB, 10) || 1,
};

const backgroundQueue = new Queue('background-tasks', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
    }
});

/**
 * Worker Logic
 */
const backgroundWorker = new Worker('background-tasks', async (job) => {
    const { type, data } = job.data;
    logger.info(`🛠️ [BackgroundQueue] Processing job ${job.id} | Type: ${type}`);

    try {
        // We import these inside to avoid circular dependencies
        const menuRepository = require('../repositories/menu.repository');
        const cacheService = require('../services/cache.service');
        const { prisma } = require('../config/database');

        switch (type) {
            case 'IMPORT_MENU': {
                const { restaurantId, filePath } = data;
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const records = parse(fileContent, { columns: true, skip_empty_lines: true });

                const itemsToCreate = [];
                for (const record of records) {
                    if (!record.name || !record.price || !record.categoryId) continue;
                    itemsToCreate.push({
                        restaurantId,
                        name: record.name,
                        slug: `${slugify(record.name)}-${Math.floor(Math.random() * 10000)}`,
                        description: record.description || null,
                        categoryId: record.categoryId,
                        price: parseFloat(record.price),
                        discountedPrice: record.discountPrice ? parseFloat(record.discountPrice) : null,
                        preparationTime: parseInt(record.preparationTime || 15, 10),
                        isAvailable: record.isAvailable !== 'false',
                        isVegetarian: record.isVegetarian === 'true',
                        isVegan: record.isVegan === 'true',
                        spiceLevel: parseInt(record.spiceLevel || 0, 10),
                        calories: record.calories ? parseInt(record.calories, 10) : null,
                        allergens: record.allergens ? record.allergens.split(',').map((s) => s.trim()) : [],
                        tags: record.tags ? record.tags.split(',').map((s) => s.trim()) : [],
                    });
                }

                if (itemsToCreate.length > 0) {
                    await menuRepository.bulkCreate(itemsToCreate);
                    await cacheService.clearMenuCache(restaurantId);
                }

                // Cleanup temp file
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                logger.info(`✅ [BackgroundQueue] Imported ${itemsToCreate.length} items for restaurant ${restaurantId}`);
                break;
            }

            case 'CLEANUP_UNAVAILABLE_ITEM': {
                const { menuItemId, restaurantId, itemName, restaurantName } = data;
                const userIds = await menuRepository.getUsersWithItemInCart(menuItemId);

                if (userIds.length > 0) {
                    const notifications = userIds.map((userId) => ({
                        userId,
                        type: 'SYSTEM',
                        title: 'Item Unavailable',
                        body: `The item "${itemName}" from ${restaurantName} is no longer available and has been removed from your cart.`,
                        data: { menuItemId, restaurantId },
                    }));

                    await prisma.notification.createMany({ data: notifications });
                    await prisma.cartItem.deleteMany({ where: { menuItemId } });
                }
                logger.info(`✅ [BackgroundQueue] Cleaned up unavailable item ${menuItemId} for ${userIds.length} users`);
                break;
            }

            default:
                logger.warn(`⚠️ [BackgroundQueue] Unknown job type: ${type}`);
        }
    } catch (error) {
        logger.error(`❌ [BackgroundQueue] Error in job ${job.id}:`, error);
        throw error;
    }
}, {
    connection,
    concurrency: 2,
});

const addBackgroundTask = async (type, data, options = {}) => {
    return backgroundQueue.add(`${type}-${Date.now()}`, { type, data }, options);
};

module.exports = {
    addBackgroundTask,
    backgroundQueue,
    backgroundWorker,
};
