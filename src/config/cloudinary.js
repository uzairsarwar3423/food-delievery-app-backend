// =============================================================
// src/config/cloudinary.js — Cloudinary SDK Setup
// =============================================================

const cloudinaryPkg = require('cloudinary');
const cloudinary = cloudinaryPkg.v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const logger = require('./logger');

// Validate required environment variables
const missingVars = [];
if (!process.env.CLOUDINARY_CLOUD_NAME) missingVars.push('CLOUDINARY_CLOUD_NAME');
if (!process.env.CLOUDINARY_API_KEY) missingVars.push('CLOUDINARY_API_KEY');
if (!process.env.CLOUDINARY_API_SECRET) missingVars.push('CLOUDINARY_API_SECRET');

if (missingVars.length > 0) {
  logger.error(`❌ Cloudinary configuration missing: ${missingVars.join(', ')}`);
} else {
  logger.info('✅ Cloudinary configuration loaded');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Storage Presets ─────────────────────────────────────────

const createStorage = (folder, allowedFormats = ['jpg', 'jpeg', 'png', 'webp']) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `${process.env.CLOUDINARY_FOLDER || 'food-delivery'}/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });

// Upload for avatar images
const avatarUpload = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// Upload for restaurant logos/covers
const restaurantUpload = multer({
  storage: createStorage('restaurants'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Upload for menu items
const menuItemUpload = multer({
  storage: createStorage('menu-items'),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

// Upload for rider documents
const documentUpload = multer({
  storage: createStorage('rider-documents', ['jpg', 'jpeg', 'png', 'pdf']),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ─── Helpers ─────────────────────────────────────────────────

const deleteCloudinaryFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.debug(`Cloudinary delete: ${publicId} — ${result.result}`);
    return result;
  } catch (err) {
    logger.error('Cloudinary delete error:', err);
    throw err;
  }
};

const extractPublicId = (url) => {
  // Extract public_id from a cloudinary URL
  const matches = url.match(/\/v\d+\/(.+)\.[a-z]+$/i);
  return matches ? matches[1] : null;
};

module.exports = {
  cloudinary,
  avatarUpload,
  restaurantUpload,
  menuItemUpload,
  documentUpload,
  deleteCloudinaryFile,
  extractPublicId,
};
