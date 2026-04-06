/**
 * src/websocket/events/order.events.js
 * Order event emitters for Socket.io
 */

const { getIO } = require('../io');
const logger = require('../../config/logger');

/**
 * Common rooms for order updates
 * @param {string} role - 'customer' | 'restaurant' | 'rider'
 * @param {string} userId - the user's id
 */
const getOrderRooms = (order) => {
    const rooms = [];

    // All order-specific subscribers (e.g. from joining order:orderId)
    rooms.push(`order:${order.id}`);

    // Direct users involved
    if (order.customerId) rooms.push(`user:${order.customerId}`);
    if (order.restaurantId) rooms.push(`restaurant:${order.restaurantId}`); // Special room if defined
    if (order.restaurant?.ownerId) rooms.push(`user:${order.restaurant.ownerId}`);
    if (order.riderId) rooms.push(`user:${order.riderId}`);

    return rooms;
};

/**
 * Emit multiple rooms at once
 */
const emitToAllRooms = (rooms, event, data) => {
    const io = getIO();
    if (!io) return;

    rooms.forEach(room => {
        io.to(room).emit(event, data);
        logger.debug(`📡 Emitted ${event} to ${room}`);
    });
};

/**
 * Event: new order created
 * @param {object} order - the order object
 */
const emitOrderNew = (order) => {
    // Notify the restaurant owner/staff
    const rooms = [`restaurant:${order.restaurantId}`, 'role:admin'];
    if (order.restaurant?.ownerId) rooms.push(`user:${order.restaurant.ownerId}`);

    emitToAllRooms(rooms, 'order:new', {
        orderId: order.id,
        status: order.status,
        restaurantId: order.restaurantId,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt
    });
};

/**
 * Event: order status changed (standard for all status changes)
 * @param {object} order - the updated order object
 */
const emitOrderStatusChanged = (order) => {
    const rooms = getOrderRooms(order);

    emitToAllRooms(rooms, 'order:status_changed', {
        orderId: order.id,
        status: order.status,
        updatedAt: order.updatedAt
    });
};

/**
 * Event: restaurant accepted order
 */
const emitOrderAccepted = (order) => {
    const rooms = getOrderRooms(order); // Notify customer

    emitToAllRooms(rooms, 'order:accepted', {
        orderId: order.id,
        status: order.status
    });
};

/**
 * Event: order ready for pickup (notify nearby riders or assigned rider)
 */
const emitOrderReady = (order) => {
    const rooms = getOrderRooms(order);
    rooms.push('role:rider'); // Notify all online riders that there's an order ready for pickup

    emitToAllRooms(rooms, 'order:ready', {
        orderId: order.id,
        status: order.status,
        pickupLocation: {
            lat: order.restaurant?.latitude,
            lng: order.restaurant?.longitude
        }
    });
};

/**
 * Event: rider picked up order
 */
const emitOrderPickedUp = (order) => {
    const rooms = getOrderRooms(order); // Notify customer and restaurant

    emitToAllRooms(rooms, 'order:picked_up', {
        orderId: order.id,
        status: order.status
    });
};

/**
 * Event: order delivered
 */
const emitOrderDelivered = (order) => {
    const rooms = getOrderRooms(order);

    emitToAllRooms(rooms, 'order:delivered', {
        orderId: order.id,
        status: order.status,
        deliveredAt: order.deliveredAt
    });
};

/**
 * Event: order cancelled
 */
const emitOrderCancelled = (order, reason = '') => {
    const rooms = getOrderRooms(order);

    emitToAllRooms(rooms, 'order:cancelled', {
        orderId: order.id,
        status: order.status,
        reason: reason
    });
};

module.exports = {
    emitOrderNew,
    emitOrderStatusChanged,
    emitOrderAccepted,
    emitOrderReady,
    emitOrderPickedUp,
    emitOrderDelivered,
    emitOrderCancelled
};
