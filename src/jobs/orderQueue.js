/**
 * src/jobs/orderQueue.js
 * Background Order Processing with BullMQ
 */

const { Queue, Worker } = require('bullmq');
const logger = require('../config/logger');
const notificationService = require('../services/notification.service');
// Lazy load repository to avoid potential circular dependencies if any
const orderRepository = require('../repositories/order.repository');

// Reuse existing Redis connection settings
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
};

// 1. Define the Queue
const orderQueue = new Queue('order-processing', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

/**
 * Worker Logic - This will process the jobs in the background
 */
const orderWorker = new Worker('order-processing', async (job) => {
    const { orderId, type } = job.data;
    logger.info(`🛠️ [OrderQueue] Processing job ${job.id} | Type: ${type} | Order: ${orderId}`);

    try {
        switch (type) {
            case 'NOTIFY_RESTAURANT':
                // In a real app, integrate with OneSignal, FCM, or Twilio
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate async work
                logger.info(`📧 [OrderQueue] Restaurant notified for order ${orderId}`);
                break;

            case 'SEND_CONFIRMATION_EMAIL':
                // In a real app, call email service
                await new Promise(resolve => setTimeout(resolve, 1500));
                logger.info(`📧 [OrderQueue] Confirmation email sent to customer for order ${orderId}`);
                break;

            case 'NOTIFY_STATUS_CHANGE': {
                const order = await orderRepository.findById(orderId);
                if (order) {
                    await notificationService.send(order.customerId, {
                        type: 'ORDER_STATUS',
                        title: 'Order Update',
                        body: `Your order ${order.orderNumber} is now ${job.data.newStatus}`,
                        data: { orderId, status: job.data.newStatus }
                    });
                    logger.info(`🔔 [OrderQueue] Customer notified of status change to ${job.data.newStatus} for order ${orderId}`);
                }
                break;
            }

            case 'NOTIFY_ORDER_CANCELLED': {
                const order = await orderRepository.findById(orderId);
                if (order) {
                    await notificationService.send(order.customerId, {
                        type: 'ORDER_CANCELLED',
                        title: 'Order Cancelled',
                        body: `Your order ${order.orderNumber} has been cancelled by ${job.data.cancelledBy}`,
                        data: { orderId }
                    });
                    logger.info(`🔔 [OrderQueue] Customer notified of cancellation for order ${orderId}`);
                }
                break;
            }

            case 'AUTO_CANCEL_EXPIRED':
                // Logic to cancel order if no restaurant accepts within X minutes
                break;

            default:
                logger.warn(`⚠️ [OrderQueue] Unknown job type: ${type}`);
        }
    } catch (error) {
        logger.error(`❌ [OrderQueue] Error in job ${job.id}:`, error);
        throw error; // Rethrow to trigger retries
    }
}, {
    connection,
    concurrency: 5, // Process up to 5 jobs simultaneously
});

orderWorker.on('completed', (job) => {
    logger.info(`✅ [OrderQueue] Job ${job.id} completed`);
});

orderWorker.on('failed', (job, err) => {
    logger.error(`❌ [OrderQueue] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

/**
 * Helper to add jobs to the queue
 */
const addOrderJob = async (type, data, options = {}) => {
    try {
        const job = await orderQueue.add(`${type}-${data.orderId}`, { type, ...data }, options);
        logger.debug(`📝 [OrderQueue] Job scheduled: ${job.id}`);
        return job;
    } catch (error) {
        logger.error('❌ [OrderQueue] Failed to add job to queue:', error);
    }
};

const shutdownQueue = async () => {
    await orderWorker.close();
    await orderQueue.close();
};

module.exports = {
    addOrderJob,
    orderQueue,
    orderWorker,
    shutdownQueue,
};
