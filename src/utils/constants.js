// =============================================================
// src/utils/constants.js — App-Wide Constants
// =============================================================

// ─── User Roles ───────────────────────────────────────────────
const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  RESTAURANT_OWNER: 'RESTAURANT_OWNER',
  DELIVERY_PERSON: 'DELIVERY_PERSON',
  ADMIN: 'ADMIN',
});

// ─── Token Types ──────────────────────────────────────────────
const TOKEN_TYPES = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
  EMAIL_VERIFY: 'email_verify',
  PASSWORD_RESET: 'password_reset',
});

// ─── Redis Key Prefixes ───────────────────────────────────────
const REDIS_KEYS = Object.freeze({
  // Auth
  ACCESS_TOKEN_BLACKLIST: 'bl:access:',        // bl:access:<token_jti>
  REFRESH_TOKEN: 'rt:',                         // rt:<userId>
  SESSION: 'session:',                          // session:<userId>
  EMAIL_VERIFY_TOKEN: 'ev:',                    // ev:<userId>
  PASSWORD_RESET_TOKEN: 'pr:',                  // pr:<token>
  USER_CACHE: 'user:',                          // user:<userId>
  // Rate limiting prefixes
  RESEND_VERIFY_LIMIT: 'rl:resend_verify:',
  FORGOT_PASS_LIMIT: 'rl:forgot_pass:',
});

// ─── Token TTLs (in seconds) ──────────────────────────────────
const TOKEN_TTL = Object.freeze({
  ACCESS: 7 * 24 * 60 * 60,      // 7 days
  REFRESH: 30 * 24 * 60 * 60,    // 30 days
  EMAIL_VERIFY: 24 * 60 * 60,    // 24 hours
  PASSWORD_RESET: 60 * 60,       // 1 hour
  SESSION: 7 * 24 * 60 * 60,     // 7 days
  USER_CACHE: 5 * 60,            // 5 minutes
  BLACKLIST: 7 * 24 * 60 * 60,   // match longest access token life
});

// ─── HTTP Status Codes ────────────────────────────────────────
const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY: 429,
  INTERNAL: 500,
});

// ─── Order Statuses ───────────────────────────────────────────
const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
});

// ─── Payment Statuses ──────────────────────────────────────────
const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
});

// ─── Payment Methods ──────────────────────────────────────────
const PAYMENT_METHOD = Object.freeze({
  CASH: 'CASH',
  JAZZCASH: 'JAZZCASH',
  EASYPAISA: 'EASYPAISA',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  WALLET: 'WALLET',
  UPI: 'UPI',
});

// ─── Pagination Defaults ──────────────────────────────────────
const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
});

// ─── File Upload ──────────────────────────────────────────────
const UPLOAD = Object.freeze({
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOC_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
  CLOUDINARY_FOLDERS: {
    AVATARS: 'food-delivery/avatars',
    RESTAURANTS: 'food-delivery/restaurants',
    MENU_ITEMS: 'food-delivery/menu-items',
    RIDER_DOCS: 'food-delivery/rider-docs',
    REVIEWS: 'food-delivery/reviews',
  },
});

// ─── Password Rules ───────────────────────────────────────────
const PASSWORD = Object.freeze({
  SALT_ROUNDS: 10,
  MIN_LENGTH: 8,
  REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
});

// ─── Email Templates ──────────────────────────────────────────
const EMAIL_TEMPLATES = Object.freeze({
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password',
  WELCOME: 'welcome',
  ORDER_CONFIRMATION: 'order-confirmation',
  ORDER_STATUS_UPDATE: 'order-status-update',
});

module.exports = {
  ROLES,
  TOKEN_TYPES,
  REDIS_KEYS,
  TOKEN_TTL,
  HTTP_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PAGINATION,
  UPLOAD,
  PASSWORD,
  EMAIL_TEMPLATES,
};
