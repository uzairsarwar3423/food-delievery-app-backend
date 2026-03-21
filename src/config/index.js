// src/config/index.js
// Central export for all config modules

module.exports = {
  database: require('./database'),
  supabase: require('./supabase'),
  redis: require('./redis'),
  cloudinary: require('./cloudinary'),
  stripe: require('./stripe'),
  logger: require('../utils/logger'),
};
