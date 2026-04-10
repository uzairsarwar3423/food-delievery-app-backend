// =============================================================
// src/middlewares/upload.middleware.js — Multer Configuration
// =============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()  }-${  Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname  }-${  uniqueSuffix  }${path.extname(file.originalname)}`);
  },
});

// File Filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'text/csv',
    'application/vnd.ms-excel'
  ];
  if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPG, JPEG, PNG, WEBP, and CSV are allowed.'), false);
  }
};

// Multer Instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = { upload };
