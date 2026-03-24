// =============================================================
// src/controllers/rider.controller.js — Rider Endpoints
// =============================================================

const riderService = require('../services/rider.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * Controller to handle all rider-related API requests
 */
class RiderController {
    /**
       * POST /api/v1/rider/auth/register
       */
    register = asyncHandler(async (req, res) => {
        const result = await riderService.registerRider(req.body);
        return ApiResponse.created(res, result, 'Rider registered successfully');
    });

    /**
       * GET /api/v1/rider/profile
       */
    getProfile = asyncHandler(async (req, res) => {
        // req.user.id is populated by auth middleware
        const profile = await riderService.getProfile(req.user.id);
        return ApiResponse.success(res, { riderProfile: profile }, 'Profile fetched successfully');
    });

    /**
       * PUT /api/v1/rider/profile
       */
    updateProfile = asyncHandler(async (req, res) => {
        const profile = await riderService.updateProfile(req.user.id, req.body);
        return ApiResponse.success(res, { riderProfile: profile }, 'Profile updated successfully');
    });

    /**
       * POST /api/v1/rider/documents/upload
       */
    uploadDocument = asyncHandler(async (req, res) => {
        if (!req.file) {
            throw ApiError.badRequest('No document file uploaded');
        }
        const document = await riderService.uploadDocument(
            req.user.id,
            req.body.documentType,
            req.file.path,
        );
        return ApiResponse.success(res, { document }, 'Document uploaded successfully');
    });

    /**
       * GET /api/v1/rider/documents
       */
    getDocuments = asyncHandler(async (req, res) => {
        const documents = await riderService.getDocuments(req.user.id);
        return ApiResponse.success(res, { documents }, 'Documents fetched successfully');
    });

    /**
       * PUT /api/v1/rider/availability
       */
    updateAvailability = asyncHandler(async (req, res) => {
        const rider = await riderService.updateAvailability(req.user.id, req.body.isAvailable);
        return ApiResponse.success(
            res,
            { isAvailable: rider.status === 'ONLINE' },
            'Availability updated',
        );
    });

    /**
       * PUT /api/v1/rider/online-status
       */
    updateOnlineStatus = asyncHandler(async (req, res) => {
        const rider = await riderService.updateOnlineStatus(req.user.id, req.body.isOnline);
        return ApiResponse.success(res, { isOnline: rider.status === 'ONLINE' }, 'Online status updated');
    });

    /**
       * GET /api/v1/rider/stats
       */
    getStats = asyncHandler(async (req, res) => {
        const stats = await riderService.getStats(req.user.id);
        return ApiResponse.success(res, { stats }, 'Stats fetched successfully');
    });

    /**
       * GET /api/v1/rider/ratings
       */
    getRatings = asyncHandler(async (req, res) => {
        const { page, limit } = req.query;
        const result = await riderService.getRatings(req.user.id, { page, limit });
        return ApiResponse.paginated(
            res,
            { reviews: result.reviews, averageRating: result.averageRating },
            { total: result.total, page, limit },
            'Ratings fetched successfully',
        );
    });

    /**
       * POST /api/v1/rider/vehicle
       */
    updateVehicle = asyncHandler(async (req, res) => {
        // If photos are provided (using req.file or similar), handle them
        // For simplicity, updating fields as per prompt
        const result = await riderService.updateVehicle(req.user.id, req.body);
        return ApiResponse.success(res, { vehicleInfo: result }, 'Vehicle info updated');
    });

    /**
       * PUT /api/v1/rider/bank-details
       */
    updateBankDetails = asyncHandler(async (req, res) => {
        await riderService.updateBankDetails(req.user.id, req.body);
        return ApiResponse.success(res, null, 'Bank details updated');
    });

    /**
       * GET /api/v1/rider/verification-status
       */
    getVerificationStatus = asyncHandler(async (req, res) => {
        const status = await riderService.getVerificationStatus(req.user.id);
        return ApiResponse.success(res, status, 'Verification status summary fetched');
    });
}

module.exports = new RiderController();
