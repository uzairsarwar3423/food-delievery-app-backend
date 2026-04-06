require('dotenv').config();
const { prisma } = require('./src/config/database');
const notificationService = require('./src/services/notification.service');
const orderRepository = require('./src/repositories/order.repository');

async function test() {
    const orderId = 'af7bb76c-5132-428e-9251-de7bf14c1ed4';
    const newStatus = 'CONFIRMED';

    console.log(`Testing status change to ${newStatus} for order ${orderId}`);

    try {
        const order = await orderRepository.findById(orderId);
        if (!order) {
            console.error('Order not found');
            return;
        }

        const statusToNotificationType = {
            CONFIRMED: 'ORDER_CONFIRMED',
            PREPARING: 'ORDER_PREPARING',
            READY_FOR_PICKUP: 'ORDER_READY',
            OUT_FOR_DELIVERY: 'ORDER_OUT_FOR_DELIVERY',
            DELIVERED: 'ORDER_DELIVERED',
            CANCELLED: 'ORDER_CANCELLED',
        };

        const notificationType = statusToNotificationType[newStatus] || 'SYSTEM';
        console.log(`Mapped status ${newStatus} to notification type ${notificationType}`);

        const result = await notificationService.send(order.customerId, {
            type: notificationType,
            title: 'Order Update (Test)',
            body: `Your order ${order.orderNumber} is now ${newStatus.replace(/_/g, ' ')}`,
            data: { orderId, status: newStatus }
        });
        console.log('✅ Notification sent successfully:', result.id);
    } catch (error) {
        console.error('❌ Failed to send notification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test().then(() => process.exit(0));
