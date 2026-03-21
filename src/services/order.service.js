/**
 * src/services/order.service.js
 * Order Business Logic
 */

const orderRepository = require('../repositories/order.repository');
const cartService = require('./cart.service');
const restaurantRepository = require('../repositories/restaurant.repository');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS, EMAIL_TEMPLATES, ROLES } = require('../utils/constants');
const { addOrderJob } = require('../jobs/orderQueue');
const { emitToRoom } = require('../websocket/socket');
const logger = require('../config/logger');

class OrderService {
    /**
     * Create a new order from a user's current cart
     */
    async createOrder(userId, orderPayload) {
        const { deliveryAddressId, paymentMethod, specialInstructions, couponCode } = orderPayload;

        // 1. Fetch current cart and calculations
        const cart = await cartService.getCart(userId);
        if (!cart || cart.items.length === 0) {
            throw new ApiError(400, 'Your shopping cart is empty');
        }

        const restaurantId = cart.restaurant.id;
        const restaurant = await restaurantRepository.findById(restaurantId);

        // 2. Business Validations
        if (!restaurant.isOpen || restaurant.status !== 'APPROVED') {
            throw new ApiError(400, 'This restaurant is currently closed or not taking orders');
        }

        if (cart.totals.subtotal < restaurant.minimumOrderAmount) {
            throw new ApiError(400, `Minimum order amount for ${restaurant.name} is Rs.${restaurant.minimumOrderAmount}`);
        }

        // 3. Address Validation (Simple check: does it exist and belong to user)
        // We can use cartService to validate as well
        const userAddresses = await userRepository.findAddressesByUserId(userId);
        const address = userAddresses.find(a => a.id === deliveryAddressId);
        if (!address) {
            throw new ApiError(400, 'Specified delivery address is invalid or not found');
        }

        // 4. Generate Order Number: ORD-YYYYMMDD-XXXX
        const orderNumber = await this._generateOrderNumber();

        // 5. Prepare Order Object
        const orderData = {
            orderNumber,
            customerId: userId,
            restaurantId,
            deliveryAddressId,
            status: ORDER_STATUS.PENDING,
            specialInstructions,
            subtotal: cart.totals.subtotal,
            deliveryFee: cart.totals.deliveryFee,
            taxAmount: cart.totals.tax,
            discountAmount: cart.totals.discount,
            totalAmount: cart.totals.total,
            couponId: cart.appliedCoupon ? cart.appliedCoupon.id : null,
            estimatedDeliveryAt: new Date(Date.now() + (restaurant.estimatedDeliveryMin + 15) * 60 * 1000),
        };

        const orderItems = cart.items.map(item => {
            const price = item.priceAtAddition;
            return {
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                itemPrice: price,
                itemName: item.menuItem.name,
                customizations: item.customizations,
                subtotal: Number(price) * item.quantity,
            };
        });

        // 6. Persistence & Atomicity (Db Transaction)
        const order = await orderRepository.createOrder(orderData, orderItems, paymentMethod, userId);

        // 8. Queue background tasks
        const user = await userRepository.findById(userId);
        await addOrderJob('NOTIFY_RESTAURANT', { orderId: order.id, restaurantId });
        await addOrderJob('SEND_CONFIRMATION_EMAIL', { orderId: order.id, customerEmail: user.email });

        // 9. Emit WebSocket events
        emitToRoom(`restaurant:${restaurantId}`, 'new_order', order);
        emitToRoom(`user:${userId}`, 'order_update', { id: order.id, status: order.status, number: order.orderNumber });

        logger.info(`✅ Order created successfully: ${order.orderNumber} for user ${userId}`);

        return order;
    }

    /**
     * Fetch paginated order history with filters
     */
    async getOrderHistory(userId, filters) {
        return orderRepository.findByUserId(userId, filters);
    }

    /**
     * Get full order details
     */
    async getOrderDetails(orderId, currentUser) {
        const order = await orderRepository.findById(orderId);
        if (!order) {
            throw new ApiError(404, 'Order not found');
        }

        // Access Control
        const isCustomer = currentUser.id === order.customerId;
        const isOwner = currentUser.role === ROLES.RESTAURANT_OWNER && currentUser.id === order.restaurant.ownerId;
        const isRider = currentUser.id === order.deliveryPersonId;
        const isAdmin = currentUser.role === ROLES.ADMIN;

        if (!isCustomer && !isOwner && !isRider && !isAdmin) {
            throw new ApiError(403, 'Permission denied to view this order');
        }

        return order;
    }

    /**
     * Cancel an order (if allowed)
     */
    async cancelOrder(orderId, userId, { reason }) {
        const order = await orderRepository.findById(orderId);
        if (!order || order.customerId !== userId) {
            throw new ApiError(404, 'Order not found or access denied');
        }

        // Logic: Only PENDING or CONFIRMED orders can be cancelled
        const cancellable = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];
        if (!cancellable.includes(order.status)) {
            throw new ApiError(400, `Cannot cancel order in ${order.status} state. Please contact support. `);
        }

        const updatedOrder = await orderRepository.updateStatus(orderId, ORDER_STATUS.CANCELLED, {
            cancelledBy: 'CUSTOMER',
            cancellationReason: reason,
        });

        // Notify stakeholders
        await addOrderJob('NOTIFY_ORDER_CANCELLED', { orderId: order.id, cancelledBy: 'CUSTOMER' });

        return updatedOrder;
    }

    /**
     * Get tracking information for a live order
     */
    async trackOrder(orderId, userId) {
        const order = await orderRepository.findById(orderId);
        if (!order || order.customerId !== userId) {
            throw new ApiError(404, 'Active order not found');
        }

        return {
            status: order.status,
            orderNumber: order.orderNumber,
            timeline: {
                pendingAt: order.createdAt,
                confirmedAt: order.acceptedAt,
                preparingAt: order.preparedAt,
                readyAt: order.preparedAt, // In schema it is preparedAt/acceptedAt etc
                pickedUpAt: order.pickedUpAt,
                deliveredAt: order.deliveredAt,
                cancelledAt: order.cancelledAt,
            },
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            rider: order.deliveryPerson ? {
                name: `${order.deliveryPerson.user.firstName} ${order.deliveryPerson.user.lastName}`,
                phone: order.deliveryPerson.user.phone,
                avatar: order.deliveryPerson.user.avatarUrl,
                location: {
                    lat: order.deliveryPerson.currentLatitude,
                    lng: order.deliveryPerson.currentLongitude,
                }
            } : null,
        };
    }

    /**
     * Fetch active orders for current user
     */
    async getActiveOrders(userId) {
        return orderRepository.findActiveByUserId(userId);
    }

    /**
     * Update order status (State machine transitions)
     */
    async updateStatus(orderId, newStatus, user) {
        const order = await orderRepository.findById(orderId);
        if (!order) {
            throw new ApiError(404, 'Order not found');
        }

        // Role-based state machine validation
        this._validateStatusTransition(order.status, newStatus, user);

        const updatedOrder = await orderRepository.updateStatus(orderId, newStatus);

        // Notify customer & emit WebSocket
        await addOrderJob('NOTIFY_STATUS_CHANGE', { orderId: order.id, newStatus });

        emitToRoom(`user:${order.customerId}`, 'order_status_updated', {
            orderId: order.id,
            status: newStatus,
            updatedAt: new Date(),
        });

        return updatedOrder;
    }

    /**
     * Re-order an existing order
     */
    async reorder(orderId, userId) {
        const order = await orderRepository.findById(orderId);
        if (!order || order.customerId !== userId) {
            throw new ApiError(404, 'Order history item not found');
        }

        // Clear cart and populate with historical items
        await cartService.clearCart(userId);

        for (const item of order.orderItems) {
            await cartService.addItemToCart(userId, {
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                customizations: item.customizations,
                clearIfDifferentRestaurant: true, // Auto-clear if reordering from new restaurant
            });
        }

        return cartService.getCart(userId);
    }

    /**
   * Get user order statistics for dashboard
   */
    async getStats(userId) {
        const { statusCounts, totalSpent } = await orderRepository.getUserStats(userId);

        const stats = {
            totalOrders: 0,
            completed: 0,
            cancelled: 0,
            totalSpent: Number(totalSpent) || 0,
        };

        statusCounts.forEach((s) => {
            stats.totalOrders += s._count._all;
            if (s.status === ORDER_STATUS.DELIVERED) {
                stats.completed = s._count._all;
            }
            if (s.status === ORDER_STATUS.CANCELLED) {
                stats.cancelled = s._count._all;
            }
        });

        return stats;
    }

    /**
   * Add a review to a delivered order
   */
    async addReview(orderId, userId, reviewPayload) {
        const { rating, comment, foodRating, serviceRating, deliveryRating, images } = reviewPayload;

        const order = await orderRepository.findById(orderId);
        if (!order || order.customerId !== userId) {
            throw new ApiError(404, 'Order not found');
        }

        if (order.status !== ORDER_STATUS.DELIVERED) {
            throw new ApiError(400, 'You can only review delivered orders');
        }

        // Check if duplicate review
        const hasExisting = await orderRepository.hasReview(orderId);
        if (hasExisting) {
            throw new ApiError(400, 'This order has already been reviewed');
        }

        const review = await orderRepository.createReview({
            orderId,
            customerId: userId,
            restaurantId: order.restaurantId,
            restaurantRating: rating,
            foodRating: foodRating || rating,
            deliveryRating,
            comment,
            images: images || [],
        });

        // In a production app, we would calculate new average rating for restaurant here
        // or trigger an async job to do so.
        await addOrderJob('RECALCULATE_RESTAURANT_RATING', { restaurantId: order.restaurantId });
        if (order.deliveryPersonId) {
            await addOrderJob('RECALCULATE_RIDER_RATING', { riderId: order.deliveryPersonId });
        }

        return review;
    }

    /**
     * ── Private Helpers ──────────────────────────────────────────
       */

    async _generateOrderNumber() {
        const now = new Date();
        const YYYYMMDD = now.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await orderRepository.countTodayOrders();
        const suffix = (count + 1).toString().padStart(4, '0');
        return `ORD-${YYYYMMDD}-${suffix}`;
    }

    _validateStatusTransition(current, target, user) {
        const { role } = user;

        // Transition Rules Map
        const transitions = {
            [ORDER_STATUS.PENDING]: {
                allowedTargets: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
                roles: [ROLES.ADMIN, ROLES.RESTAURANT_OWNER],
            },
            [ORDER_STATUS.CONFIRMED]: {
                allowedTargets: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
                roles: [ROLES.ADMIN, ROLES.RESTAURANT_OWNER],
            },
            [ORDER_STATUS.PREPARING]: {
                allowedTargets: [ORDER_STATUS.READY_FOR_PICKUP],
                roles: [ROLES.ADMIN, ROLES.RESTAURANT_OWNER],
            },
            [ORDER_STATUS.READY_FOR_PICKUP]: {
                allowedTargets: [ORDER_STATUS.OUT_FOR_DELIVERY],
                roles: [ROLES.ADMIN, ROLES.DELIVERY_PERSON],
            },
            [ORDER_STATUS.OUT_FOR_DELIVERY]: {
                allowedTargets: [ORDER_STATUS.DELIVERED],
                roles: [ROLES.ADMIN, ROLES.DELIVERY_PERSON],
            },
        };

        const config = transitions[current];

        if (!config) {
            throw new ApiError(400, `State transition from ${current} is not possible`);
        }

        if (!config.allowedTargets.includes(target)) {
            throw new ApiError(400, `Invalid status move: ${current} -> ${target}`);
        }

        if (role !== ROLES.ADMIN && !config.roles.includes(role)) {
            throw new ApiError(403, `You are not authorized to update order to ${target}`);
        }
    }
}

module.exports = new OrderService();
