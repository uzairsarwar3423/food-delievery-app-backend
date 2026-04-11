// =============================================================
// src/services/rider.service.js — Rider Business Logic
// =============================================================

const riderRepository = require('../repositories/rider.repository');
const uploadService = require('./upload.service');
const authService = require('./auth.service'); // Using for token generation
const { hashPassword } = require('../utils/encryption');
const ApiError = require('../utils/ApiError');
const { cacheSet } = require('../config/redis');
const { sendVerificationEmail } = require('../utils/mailer');
const { REDIS_KEYS, TOKEN_TTL } = require('../utils/constants');
const crypto = require('crypto');
const { prisma } = require('../config/database');


class RiderService {
    /**
       * Register a new rider
       */
    async registerRider(registerData) {
        const { email, password, phone, fullName, cnicNumber, dateOfBirth, licenseExpiry, ...riderDetails } = registerData;

        // 1. Check duplicates
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });
        if (existingUser) {
            throw ApiError.conflict('Email or phone already registered');
        }

        const existingRider = await riderRepository.findByCnic(cnicNumber);
        if (existingRider) {
            throw ApiError.conflict('CNIC number already registered');
        }

        // 2. Hash password
        const passwordHash = await hashPassword(password);

        // 3. Split name
        const [firstName, ...rest] = fullName.split(' ');
        const lastName = rest.join(' ') || '';

        // 4. Create in repository
        const userData = {
            email,
            phone,
            passwordHash,
            firstName,
            lastName,
            role: 'DELIVERY_PERSON',
        };

        const riderData = {
            cnicNumber,
            ...riderDetails,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
            status: 'OFFLINE',
        };

        const result = await riderRepository.createRider(userData, riderData);


        // 5. Generate Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await cacheSet(
            `${REDIS_KEYS.EMAIL_VERIFY_TOKEN}${verificationToken}`,
            result.user.id,
            TOKEN_TTL.EMAIL_VERIFY,
        );

        // 6. Send Verification Email
        sendVerificationEmail(
            result.user.email,
            `${result.user.firstName} ${result.user.lastName}`,
            verificationToken,
        );

        // 7. Generate Tokens
        const tokens = await authService.generateAuthTokens(result.user.id);


        return {
            user: result.user,
            deliveryPerson: result.deliveryPerson,
            tokens,
        };
    }

    /**
       * Get rider profile
       */
    async getProfile(userId) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }

        const stats = await riderRepository.getStats(rider.id);

        return {
            ...rider,
            stats,
        };
    }

    /**
       * Update rider profile
       */
    async updateProfile(userId, updateData) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }

        // Check if phone being updated
        if (updateData.phone) {
            await prisma.user.update({
                where: { id: userId },
                data: { phone: updateData.phone }
            });
            delete updateData.phone;
        }

        return riderRepository.update(rider.id, updateData);
    }

    /**
       * Upload rider document
       */
    async uploadDocument(userId, documentType, filePath) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }

        // 1. Upload to Cloudinary
        const uploadResult = await uploadService.uploadImage(filePath, `riders/${rider.id}/documents`);

        // 2. Save document record
        const document = await riderRepository.upsertDocument(rider.id, {
            documentType,
            documentUrl: uploadResult.secure_url,
        });

        // 3. Update overall status to pending if it was rejected or unknown
        // (Logic could be more complex here)

        return document;
    }

    /**
       * List all documents
       */
    async getDocuments(userId) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }
        return riderRepository.getDocuments(rider.id);
    }

    /**
       * Update availability status
       */
    async updateAvailability(userId, isAvailable) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }

        // Logic: If going offline, check no active deliveries
        if (!isAvailable) {
            const activeOrders = await prisma.order.findFirst({
                where: {
                    deliveryPersonId: rider.id,
                    status: { in: ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'] },
                },
            });

            if (activeOrders) {
                throw ApiError.badRequest('Cannot go offline with active deliveries');
            }
        }

        const newStatus = isAvailable ? 'ONLINE' : 'OFFLINE';
        return riderRepository.update(rider.id, { status: newStatus });
    }

    /**
       * Update online status (similar but maybe for dispatch)
       */
    async updateOnlineStatus(userId, isOnline) {
        // Prompt says: If going offline, update location - Notify dispatch system
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }

        const updateData = { status: isOnline ? 'ONLINE' : 'OFFLINE' };

        // Potentially update location here if location data is in req

        return riderRepository.update(rider.id, updateData);
    }

    /**
       * Get statistics
       */
    async getStats(userId) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }
        return riderRepository.getStats(rider.id);
    }

    /**
       * Get reviews
       */
    async getRatings(userId, paginationOptions) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }
        const { reviews, total } = await riderRepository.getRatings(rider.id, paginationOptions);

        // Average rating is already on deliveryPerson
        return {
            reviews,
            averageRating: rider.averageRating,
            total,
        };
    }

    /**
       * Update vehicle information
       */
    async updateVehicle(userId, vehicleInfo) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }
        return riderRepository.update(rider.id, vehicleInfo);
    }

    /**
       * Update bank details
       */
    async updateBankDetails(userId, bankDetails) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }
        // These fields might need to be added to schema, but we'll try to update
        // If they error, we'll know the schema is missing them.
        return riderRepository.update(rider.id, bankDetails);
    }

    /**
       * Get verification status summary
       */
    async getVerificationStatus(userId) {
        const rider = await riderRepository.findByUserId(userId);
        if (!rider) {
            throw ApiError.notFound('Rider profile not found');
        }

        const documents = await riderRepository.getDocuments(rider.id);

        return {
            overallStatus: rider.isDocumentVerified ? 'APPROVED' : 'PENDING',
            documents: documents.map(d => ({
                documentType: d.documentType,
                status: d.status
            }))
        };
    }

    /**
     * Get all riders for a specific restaurant
     */
    async getRidersByRestaurant(restaurantId) {
        return riderRepository.findManyByRestaurant(restaurantId);
    }

    /**
     * Register a new rider associated with a restaurant
     */
    async registerRestaurantRider(restaurantId, registerData) {
        // Simple wrapper around registerRider that ensures restaurantId is set
        const result = await this.registerRider({
            ...registerData,
            restaurantId
        });

        return result;
    }
}

module.exports = new RiderService();
