// =============================================================
// src/services/delivery.service.js — Delivery Business Logic
// =============================================================

const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS, HTTP_STATUS } = require('../utils/constants');
const { calculateDistance, getPaginationParams, buildPaginationMeta, generateOTP } = require('../utils/helpers');
const riderRepository = require('../repositories/rider.repository');
const deliveryRepository = require('../repositories/delivery.repository');
const uploadService = require('./upload.service');

const orderEvents = require('../websocket/events/order.events');
const locationEvents = require('../websocket/events/location.events');
const logger = require('../config/logger');

class DeliveryService {
    /**
     * Fetch available deliveries near a rider
     */
    async getAvailableDeliveries(userId, { latitude, longitude }) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

        // Check if rider is online
        if (rider.status !== 'ONLINE') {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You must be online to view available deliveries');
        }

        // Fetch orders ready for pickup with no rider assigned
        const orders = await prisma.order.findMany({
            where: {
                status: ORDER_STATUS.READY_FOR_PICKUP,
                deliveryPersonId: null,
            },
            include: {
                restaurant: {
                    select: {
                        name: true,
                        addressLine1: true,
                        latitude: true,
                        longitude: true,
                    }
                },
                deliveryAddress: {
                    select: {
                        addressLine1: true,
                        latitude: true,
                        longitude: true,
                    }
                }
            }
        });

        // Calculate distances and sort
        const deliveries = orders.map(order => {
            const distance = calculateDistance(
                parseFloat(latitude),
                parseFloat(longitude),
                parseFloat(order.restaurant.latitude),
                parseFloat(order.restaurant.longitude)
            );
            return {
                ...order,
                distanceToRestaurant: distance
            };
        }).sort((a, b) => a.distanceToRestaurant - b.distanceToRestaurant);

        return deliveries;
    }

    /**
     * Rider accepts a delivery
     */
    async acceptDelivery(userId, orderId) {
        try {
            const rider = await riderRepository.findByUserId(userId);
            if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

            if (rider.status !== 'ONLINE' || !rider.isAvailable) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Rider is not available for new deliveries');
            }

            // Check if rider already has an active delivery
            const activeDelivery = await prisma.order.findFirst({
                where: {
                    deliveryPersonId: rider.id,
                    status: {
                        in: [ORDER_STATUS.READY_FOR_PICKUP, ORDER_STATUS.OUT_FOR_DELIVERY]
                    }
                }
            });

            if (activeDelivery) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You already have an active delivery');
            }

            // Atomic update: Ensure order is still available
            const result = await prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: orderId }
                });

                if (!order || order.deliveryPersonId || order.status !== ORDER_STATUS.READY_FOR_PICKUP) {
                    throw new ApiError(HTTP_STATUS.CONFLICT, 'Order is no longer available');
                }

                // Generate pickup code if not exists
                const pickupCode = order.verificationCode || generateOTP(6);

                const updatedOrder = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        deliveryPersonId: rider.id,
                        verificationCode: pickupCode,
                    },
                    include: {
                        restaurant: true,
                        deliveryAddress: true,
                        customer: {
                            select: { firstName: true, phone: true }
                        }
                    }
                });

                // Update rider availability
                await tx.deliveryPerson.update({
                    where: { id: rider.id },
                    data: { isAvailable: false }
                });

                return updatedOrder;
            });

            // Calculate earnings (Base + Distance) - Placeholder logic
            const earnings = 50 + (Number(result.deliveryFee || 0) * 0.7);
            await prisma.order.update({
                where: { id: orderId },
                data: { riderEarnings: earnings }
            });

            // Notify customer and restaurant
            orderEvents.emitOrderStatusChanged(result);
            orderEvents.emitToAllRooms([`user:${result.customerId}`], 'rider_assigned', {
                orderId: result.id,
                rider: {
                    name: `${rider.user.firstName} ${rider.user.lastName}`,
                    phone: rider.user.phone,
                }
            });

            return { ...result, riderEarnings: earnings };
        } catch (error) {
            console.error('AcceptDelivery Error:', error);
            throw error;
        }
    }

    /**
     * Decline delivery
     */
    async declineDelivery(userId, orderId) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider profile not found');

        // Logic to track acceptance rate
        const currentRate = parseFloat(rider.acceptanceRate);
        const newRate = Math.max(0, currentRate - 1); // Decrease by 1% for example

        await prisma.deliveryPerson.update({
            where: { id: rider.id },
            data: { acceptanceRate: newRate }
        });

        return { message: 'Delivery declined', acceptanceRate: newRate };
    }

    /**
     * Rider arrives at restaurant
     */
    async arriveAtRestaurant(userId, orderId) {
        try {
            const rider = await riderRepository.findByUserId(userId);
            const order = await prisma.order.findUnique({ where: { id: orderId } });

            if (!order || order.deliveryPersonId !== rider.id) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Action not authorized for this delivery');
            }

            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { arrivedAtRestaurantAt: new Date() }
            });

            orderEvents.emitToAllRooms([`restaurant:${order.restaurantId}`], 'rider_arrived', { orderId });

            return updatedOrder;
        } catch (error) {
            console.error('ArriveAtRestaurant Error:', error);
            throw error;
        }
    }

    /**
     * Rider picks up the order
     */
    async pickupDelivery(userId, orderId, verificationCode) {
        try {
            const rider = await riderRepository.findByUserId(userId);
            const order = await prisma.order.findUnique({ where: { id: orderId } });

            if (!order || order.deliveryPersonId !== rider.id) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Action not authorized');
            }

            if (order.verificationCode !== verificationCode) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid verification code');
            }

            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: ORDER_STATUS.OUT_FOR_DELIVERY,
                    pickedUpAt: new Date()
                }
            });

            // Generate a new code for the customer completion
            const customerCode = generateOTP(6);
            await prisma.order.update({
                where: { id: orderId },
                data: { verificationCode: customerCode }
            });

            orderEvents.emitOrderPickedUp(updatedOrder);

            return { ...updatedOrder, nextVerificationCode: customerCode };
        } catch (error) {
            console.error('PickupDelivery Error:', error);
            throw error;
        }
    }

    /**
     * Update real-time location
     */
    async updateLocation(userId, locationData) {
        const { latitude, longitude, accuracy, speed, heading } = locationData;
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');

        await prisma.deliveryPerson.update({
            where: { id: rider.id },
            data: {
                currentLatitude: latitude,
                currentLongitude: longitude,
                lastLocationUpdate: new Date()
            }
        });

        // Broadcast to customer tracking if order is active
        const activeOrder = await prisma.order.findFirst({
            where: {
                deliveryPersonId: rider.id,
                status: ORDER_STATUS.OUT_FOR_DELIVERY
            }
        });

        if (activeOrder) {
            locationEvents.emitRiderLocationUpdate(rider.id, {
                orderId: activeOrder.id,
                latitude,
                longitude,
                accuracy,
                speed,
                heading,
                updatedAt: new Date()
            });
        }

        return { message: 'Location updated' };
    }

    /**
     * Rider arrives at customer location
     */
    async arriveAtCustomer(userId, orderId) {
        try {
            const rider = await riderRepository.findByUserId(userId);
            const order = await prisma.order.findUnique({ where: { id: orderId } });

            if (!order || order.deliveryPersonId !== rider.id) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Action not authorized');
            }

            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { arrivedAtCustomerAt: new Date() }
            });

            orderEvents.emitToAllRooms([`user:${order.customerId}`], 'rider_arrived_at_customer', { orderId });

            return updatedOrder;
        } catch (error) {
            console.error('ArriveAtCustomer Error:', error);
            throw error;
        }
    }

    /**
     * Complete delivery
     */
    async completeDelivery(userId, orderId, completionData) {
        try {
            const { verificationCode, proofOfDelivery, notes, cashCollected } = completionData;
            const rider = await riderRepository.findByUserId(userId);
            if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');

            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: { payment: true }
            });

            if (!order || order.deliveryPersonId !== rider.id) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Action not authorized');
            }

            if (order.verificationCode !== verificationCode) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid customer verification code');
            }

            // Handle proof of delivery upload if exists
            let proofUrl = null;
            if (proofOfDelivery) {
                // Assume proofOfDelivery is a base64 or file path handled by controller/multer
                // For now we'll store as is or if it's a path we'd upload
                // Using a mock upload result if it's already uploaded by middleware
                proofUrl = proofOfDelivery;
            }

            const result = await prisma.$transaction(async (tx) => {
                const updatedOrder = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: ORDER_STATUS.DELIVERED,
                        deliveredAt: new Date(),
                        proofOfDeliveryUrl: proofUrl,
                        deliveryNotes: notes
                    }
                });

                // Update rider stats
                await tx.deliveryPerson.update({
                    where: { id: rider.id },
                    data: {
                        totalDeliveries: { increment: 1 },
                        totalEarnings: { increment: order.riderEarnings },
                        isAvailable: true
                    }
                });

                // If COD, update payment
                if (order.payment && order.payment.method === 'CASH') {
                    await tx.payment.update({
                        where: { id: order.payment.id },
                        data: {
                            status: 'COMPLETED',
                            paidAt: new Date(),
                            amountReceived: cashCollected || order.totalAmount,
                            receivedBy: rider.id
                        }
                    });
                }

                return updatedOrder;
            });

            // Notify customer
            orderEvents.emitOrderDelivered(result);
            orderEvents.emitToAllRooms([`user:${order.customerId}`], 'delivery_completed', { orderId: result.id });

            return { order: result, earnings: order.riderEarnings };
        } catch (error) {
            console.error('CompleteDelivery Error:', error);
            throw error;
        }
    }

    /**
     * Delivery history
     */
    async getHistory(userId, filters) {
        const { page = 1, limit = 10, dateFrom, dateTo } = filters;
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');

        const { skip, take } = getPaginationParams(page, limit);

        const where = {
            deliveryPersonId: rider.id,
            status: ORDER_STATUS.DELIVERED,
        };

        if (dateFrom || dateTo) {
            where.deliveredAt = {};
            if (dateFrom) where.deliveredAt.gte = new Date(dateFrom);
            if (dateTo) where.deliveredAt.lte = new Date(dateTo);
        }

        const [deliveries, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: { restaurant: true, deliveryAddress: true },
                orderBy: { deliveredAt: 'desc' },
                skip,
                take
            }),
            prisma.order.count({ where })
        ]);

        return {
            deliveries,
            pagination: buildPaginationMeta(total, page, limit)
        };
    }

    /**
     * Report an issue
     */
    async reportIssue(userId, orderId, issueData) {
        const { issueType, description, images } = issueData;
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');

        const issue = await prisma.deliveryIssue.create({
            data: {
                orderId,
                riderId: rider.id,
                issueType,
                description,
                images: images || [],
                status: 'pending'
            }
        });

        return issue;
    }

    /**
     * Restaurant owner assigns a rider to an order
     */
    async assignRiderToOrder(ownerUserId, orderId, riderId) {
        try {
            // 1. Fetch order and check ownership
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: { restaurant: true }
            });

            if (!order) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            if (order.restaurant.ownerId !== ownerUserId) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not authorized to manage this order');
            }

            // 2. Fetch rider and check they belong to this restaurant
            const rider = await prisma.deliveryPerson.findUnique({
                where: { id: riderId },
                include: { user: true }
            });

            if (!rider) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');
            if (rider.restaurantId !== order.restaurantId) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Rider does not belong to this restaurant');
            }

            // 3. Update order
            const result = await prisma.$transaction(async (tx) => {
                // Generate pickup code if not exists
                const pickupCode = order.verificationCode || generateOTP(6);

                const updatedOrder = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        deliveryPersonId: rider.id,
                        verificationCode: pickupCode,
                        status: order.status === ORDER_STATUS.PENDING ? ORDER_STATUS.CONFIRMED : order.status
                    },
                    include: {
                        restaurant: true,
                        deliveryAddress: true,
                        customer: {
                            select: { firstName: true, phone: true }
                        }
                    }
                });

                // Update rider availability (optional, depends on if we want to allow multiple)
                await tx.deliveryPerson.update({
                    where: { id: rider.id },
                    data: { isAvailable: false }
                });

                return updatedOrder;
            });

            // 4. Notifications
            orderEvents.emitOrderStatusChanged(result);
            orderEvents.emitToAllRooms([`user:${result.customerId}`], 'rider_assigned', {
                orderId: result.id,
                rider: {
                    name: `${rider.user.firstName} ${rider.user.lastName}`,
                    phone: rider.user.phone,
                }
            });

            // Notify Rider
            orderEvents.emitToAllRooms([`user:${rider.userId}`], 'new_assignment', {
                orderId: result.id,
                orderNumber: result.orderNumber,
                restaurantName: result.restaurant.name
            });

            return result;
        } catch (error) {
            console.error('AssignRiderToOrder Error:', error);
            throw error;
        }
    }
}

module.exports = new DeliveryService();
