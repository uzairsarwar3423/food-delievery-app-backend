// =============================================================
// src/services/upload.service.js — Cloudinary File Upload Service
// =============================================================

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class UploadService {
  /**
     * Upload an image to Cloudinary
     * @param {string} filePath - Path to the local file
     * @param {string} folder - Destination folder on Cloudinary
     * @returns {Promise<Object>} - Cloudinary upload response
     */
  async uploadImage(filePath, folder = 'users/avatars') {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `${process.env.CLOUDINARY_FOLDER || 'food-delivery'}/${folder}`,
        use_filename: true,
        unique_filename: true,
        overwrite: true,
        resource_type: 'image',
      });

      // Delete local file after upload
      fs.unlinkSync(filePath);

      return result;
    } catch (error) {
      // Delete local file even if upload fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      logger.error('Cloudinary Upload Error Details:', {
        message: error.message,
        http_code: error.http_code,
        name: error.name,
      });
      throw new ApiError(500, `Failed to upload image to Cloudinary: ${error.message || 'Unknown error'}`);
    }
  }

  /**
     * Delete an image from Cloudinary
     * @param {string} publicId - Public ID of the image on Cloudinary
     * @returns {Promise<Object>} - Cloudinary response
     */
  async deleteImage(publicId) {
    try {
      if (!publicId) { return null; }
      return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      logger.error('Cloudinary Delete Error:', error);
      throw new ApiError(500, 'Failed to delete image from Cloudinary');
    }
  }

  /**
     * Extract publicId from Cloudinary URL
     * @param {string} url - Full Cloudinary URL
     * @returns {string|null} - Public ID
     */
  getPublicIdFromUrl(url) {
    if (!url) { return null; }
    // Example URL: https://res.cloudinary.com/[cloud_name]/image/upload/v123456789/food-delivery/users/avatars/avatar_123.jpg
    // Public ID: food-delivery/users/avatars/avatar_123
    const parts = url.split('/');
    const fileNameWithExt = parts[parts.length - 1];
    const fileName = fileNameWithExt.split('.')[0];
    const folders = parts.slice(parts.indexOf('upload') + 2, parts.length - 1).join('/');
    return `${folders}/${fileName}`;
  }
}

module.exports = new UploadService();
