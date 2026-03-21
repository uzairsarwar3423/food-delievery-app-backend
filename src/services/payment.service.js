/**
 * src/services/payment.service.js
 * Payment Business Logic (COD + Future Integrations)
 */

const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { PAYMENT_STATUS, PAYMENT_METHOD, ORDER_STATUS, ROLES } = require('../utils/constants');
const logger = require('../config/logger');

class PaymentService {
    /**
     * Create or initiate a payment for an order
     */
    async createPayment(userId, { orderId, paymentMethod }) {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            throw new ApiError(404, 'Order not found');
        }

        if (order.customerId !== userId) {
            throw new ApiError(403, 'You do not have permission to pay for this order');
        }

        // Check if payment already completed
        const existingPayment = await prisma.payment.findUnique({
            where: { orderId }
        });

        if (existingPayment && existingPayment.status === PAYMENT_STATUS.COMPLETED) {
            throw new ApiError(400, 'This order has already been paid');
        }

        const method = paymentMethod.toUpperCase();

        // Use a 6-digit verification code for COD
        const verificationCode = method === PAYMENT_METHOD.CASH ? this._generateVerificationCode() : null;

        let payment;
        if (existingPayment) {
            payment = await prisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                    method: method,
                    status: method === PAYMENT_METHOD.CASH ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PROCESSING,
                    verificationCode: verificationCode,
                    amount: order.totalAmount
                }
            });
        } else {
            payment = await prisma.payment.create({
                data: {
                    orderId,
                    amount: order.totalAmount,
                    method,
                    status: method === PAYMENT_METHOD.CASH ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PROCESSING,
                    verificationCode
                }
            });
        }

        let message = '';
        if (method === PAYMENT_METHOD.CASH) {
            message = 'Cash on delivery - Pay rider upon delivery';
        } else {
            message = `Directing to ${paymentMethod} payment gateway...`;
        }

        return { payment, message };
    }

    /**
     * Get payment details by ID
     */
    async getPaymentById(paymentId, userId) {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                order: {
                    include: {
                        deliveryPerson: {
                            include: {
                                user: {
                                    select: { firstName: true, lastName: true, phone: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!payment) {
            throw new ApiError(404, 'Payment not found');
        }

        if (payment.order.customerId !== userId) {
            throw new ApiError(403, 'Access denied');
        }

        const rider = payment.order.deliveryPerson ? {
            name: `${payment.order.deliveryPerson.user.firstName} ${payment.order.deliveryPerson.user.lastName}`,
            phone: payment.order.deliveryPerson.user.phone
        } : null;

        return {
            ...payment,
            orderNumber: payment.order.orderNumber,
            rider
        };
    }

    /**
     * Get payment by Order ID
     */
    async getPaymentByOrderId(orderId, userId) {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order || order.customerId !== userId) {
            throw new ApiError(404, 'Order not found or access denied');
        }

        const payment = await prisma.payment.findUnique({
            where: { orderId }
        });

        return payment;
    }

    /**
     * Confirm cash payment (Rider only)
     */
    async confirmCashPayment(userId, paymentId, { amountReceived, verificationCode }) {
        const rider = await prisma.deliveryPerson.findUnique({
            where: { userId }
        });

        if (!rider) {
            throw new ApiError(403, 'You are not registered as a delivery person');
        }

        const riderId = rider.id;

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { order: true }
        });

        if (!payment) {
            throw new ApiError(404, 'Payment not found');
        }

        if (payment.method !== PAYMENT_METHOD.CASH) {
            throw new ApiError(400, 'Confirmation is only available for Cash on Delivery');
        }

        if (payment.status === PAYMENT_STATUS.COMPLETED) {
            throw new ApiError(400, 'This payment is already completed');
        }

        if (payment.order.deliveryPersonId !== riderId) {
            throw new ApiError(403, 'You are not assigned to this order');
        }

        if (Number(amountReceived) !== Number(payment.amount)) {
            throw new ApiError(400, `Amount received (Rs.${amountReceived}) does not match order total (Rs.${payment.amount})`);
        }

        if (verificationCode !== payment.verificationCode) {
            throw new ApiError(400, 'Invalid verification code provided by customer');
        }

        const updatedPayment = await prisma.$transaction(async (tx) => {
            const p = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: PAYMENT_STATUS.COMPLETED,
                    paidAt: new Date(),
                    amountReceived: amountReceived,
                    receivedBy: riderId,
                    cashDepositStatus: 'pending'
                }
            });

            await tx.order.update({
                where: { id: payment.orderId },
                data: { status: ORDER_STATUS.DELIVERED }
            });

            return p;
        });

        logger.info(`💰 Cash payment confirmed for order ${payment.order.orderNumber} by rider ${riderId}`);

        return updatedPayment;
    }

    /**
     * Get payment history for user
     */
    async getPaymentHistory(userId, filters) {
        const { page = 1, limit = 20, paymentMethod, status, dateFrom, dateTo } = filters;
        const skip = (page - 1) * limit;

        const where = {
            order: { customerId: userId }
        };

        if (paymentMethod) where.method = paymentMethod.toUpperCase();
        if (status) where.status = status.toUpperCase();
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) where.createdAt.lte = new Date(dateTo);
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    order: {
                        include: {
                            restaurant: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma.payment.count({ where })
        ]);

        return {
            payments: payments.map(p => ({
                id: p.id,
                orderNumber: p.order.orderNumber,
                amount: p.amount,
                paymentMethod: p.method,
                status: p.status,
                paidAt: p.paidAt,
                restaurant: { name: p.order.restaurant.name }
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get rider cash collections
     */
    async getRiderCollections(userId, filters) {
        const rider = await prisma.deliveryPerson.findUnique({ where: { userId } });
        if (!rider) return { totalCollected: 0, totalDeposited: 0, cashInHand: 0, collections: [] };
        const riderId = rider.id;
        const { dateFrom, dateTo, status } = filters;

        const where = {
            receivedBy: riderId,
            method: PAYMENT_METHOD.CASH,
            status: PAYMENT_STATUS.COMPLETED
        };

        if (status) where.cashDepositStatus = status;
        if (dateFrom || dateTo) {
            where.paidAt = {};
            if (dateFrom) where.paidAt.gte = new Date(dateFrom);
            if (dateTo) where.paidAt.lte = new Date(dateTo);
        }

        const collections = await prisma.payment.findMany({
            where,
            include: { order: true },
            orderBy: { paidAt: 'desc' }
        });

        const totalCollected = collections.reduce((acc, curr) => acc + Number(curr.amountReceived), 0);
        const deposits = await prisma.riderCashDeposit.findMany({
            where: { riderId, status: 'verified' }
        });
        const totalDeposited = deposits.reduce((acc, curr) => acc + Number(curr.amount), 0);

        return {
            totalCollected,
            totalDeposited,
            cashInHand: totalCollected - totalDeposited,
            collections: collections.map(c => ({
                orderId: c.orderId,
                orderNumber: c.order.orderNumber,
                amount: c.amountReceived,
                collectedAt: c.paidAt,
                depositStatus: c.cashDepositStatus
            }))
        };
    }

    /**
     * Rider deposits cash
     */
    async riderDeposit(userId, payload) {
        const rider = await prisma.deliveryPerson.findUnique({ where: { userId } });
        if (!rider) throw new ApiError(403, 'Not a delivery person');
        const riderId = rider.id;
        const { amount, depositProof, notes } = payload;

        const collections = await this.getRiderCollections(userId, {});
        if (Number(amount) > collections.cashInHand) {
            throw new ApiError(400, `Insufficient cash in hand. Your balance: Rs.${collections.cashInHand}`);
        }

        const deposit = await prisma.$transaction(async (tx) => {
            const d = await tx.riderCashDeposit.create({
                data: {
                    riderId,
                    amount: Number(amount),
                    depositProofUrl: depositProof,
                    notes,
                    status: 'pending'
                }
            });

            await tx.payment.updateMany({
                where: {
                    receivedBy: riderId,
                    cashDepositStatus: 'pending'
                },
                data: {
                    cashDepositStatus: 'deposited',
                    depositedAt: new Date(),
                    depositProofUrl: depositProof
                }
            });

            return d;
        });

        return {
            deposit,
            remainingBalance: collections.cashInHand - Number(amount)
        };
    }

    /**
     * Get available payment methods
     */
    async getAvailableMethods() {
        return [
            {
                method: 'cash',
                name: 'Cash on Delivery',
                isActive: true,
                icon: 'https://res.cloudinary.com/demo/image/upload/v1/payment_icons/cash.png',
                description: 'Pay with cash when order is delivered'
            },
            {
                method: 'jazzcash',
                name: 'JazzCash',
                isActive: false,
                icon: 'https://res.cloudinary.com/demo/image/upload/v1/payment_icons/jazzcash.png',
                description: 'Coming Soon',
                comingSoon: true
            },
            {
                method: 'easypaisa',
                name: 'EasyPaisa',
                isActive: false,
                icon: 'https://res.cloudinary.com/demo/image/upload/v1/payment_icons/easypaisa.png',
                description: 'Coming Soon',
                comingSoon: true
            }
        ];
    }

    _generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
}

module.exports = new PaymentService();
