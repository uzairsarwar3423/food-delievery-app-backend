# 🚀 15-Day Scalable Backend Development Plan
## Complete Strategy - Food Delivery Backend (PostgreSQL/Supabase)

---

## 📋 Executive Summary

**Duration:** 15 Working Days
**Objective:** Build production-ready, scalable backend APIs
**Final Deliverable:** 100+ RESTful APIs, Complete Database, Real-time Features

**Tech Stack:**
- Node.js v18+ with Express.js
- PostgreSQL (Supabase Cloud)
- Prisma ORM
- Redis (Caching & Sessions)
- Cloudinary (Media Storage)
- JWT Authentication
- Socket.io (Real-time)
- Stripe (Payments)

---

## 📂 Complete Backend File Structure

```
food-delivery-backend/
│
├── prisma/
│   ├── schema.prisma              # Complete database schema (15+ tables)
│   ├── migrations/                # Auto-generated SQL migrations
│   └── seed.js                    # Sample data for testing
│
├── src/
│   ├── config/                    # Configuration files
│   │   ├── database.js            # Prisma client singleton
│   │   ├── supabase.js            # Supabase client
│   │   ├── redis.js               # Redis client
│   │   ├── cloudinary.js          # Cloudinary SDK
│   │   ├── stripe.js              # Stripe config
│   │   └── index.js               # Export all configs
│   │
│   ├── controllers/               # Request handlers (handle HTTP requests)
│   │   ├── auth.controller.js     # 9 endpoints
│   │   ├── user.controller.js     # 8 endpoints
│   │   ├── restaurant.controller.js # 10 endpoints
│   │   ├── menu.controller.js     # 8 endpoints
│   │   ├── category.controller.js # 6 endpoints
│   │   ├── cart.controller.js     # 6 endpoints
│   │   ├── order.controller.js    # 10 endpoints
│   │   ├── payment.controller.js  # 7 endpoints
│   │   ├── review.controller.js   # 5 endpoints
│   │   ├── rider.controller.js    # 12 endpoints
│   │   ├── search.controller.js   # 4 endpoints
│   │   └── admin.controller.js    # 15 endpoints
│   │
│   ├── services/                  # Business logic layer
│   │   ├── auth.service.js        # Authentication logic
│   │   ├── user.service.js        # User operations
│   │   ├── restaurant.service.js  # Restaurant operations
│   │   ├── menu.service.js        # Menu operations
│   │   ├── cart.service.js        # Cart calculations
│   │   ├── order.service.js       # Order processing
│   │   ├── payment.service.js     # Stripe integration
│   │   ├── rider.service.js       # Rider management
│   │   ├── notification.service.js # Push/Email/SMS
│   │   ├── email.service.js       # Email templates
│   │   ├── upload.service.js      # Cloudinary uploads
│   │   ├── cache.service.js       # Redis operations
│   │   └── location.service.js    # Geo calculations
│   │
│   ├── repositories/              # Data access layer (Prisma queries)
│   │   ├── base.repository.js     # Base repository with common methods
│   │   ├── user.repository.js     # User DB operations
│   │   ├── restaurant.repository.js
│   │   ├── order.repository.js
│   │   └── ...
│   │
│   ├── routes/                    # API routes
│   │   ├── index.js               # Main router (API versioning)
│   │   └── v1/                    # Version 1 routes
│   │       ├── auth.routes.js
│   │       ├── user.routes.js
│   │       ├── restaurant.routes.js
│   │       ├── menu.routes.js
│   │       ├── cart.routes.js
│   │       ├── order.routes.js
│   │       ├── payment.routes.js
│   │       ├── review.routes.js
│   │       ├── rider.routes.js
│   │       ├── search.routes.js
│   │       └── admin.routes.js
│   │
│   ├── middlewares/               # Express middlewares
│   │   ├── auth.middleware.js     # JWT verification
│   │   ├── authorize.middleware.js # Role-based access control
│   │   ├── validate.middleware.js  # Request validation (Joi)
│   │   ├── error.middleware.js     # Global error handler
│   │   ├── upload.middleware.js    # Multer file upload
│   │   ├── cache.middleware.js     # Redis caching
│   │   ├── rateLimiter.middleware.js # Rate limiting
│   │   └── logger.middleware.js    # Request logging
│   │
│   ├── validators/                # Joi validation schemas
│   │   ├── auth.validator.js      # Login, register, etc.
│   │   ├── user.validator.js      # User operations
│   │   ├── restaurant.validator.js
│   │   ├── menu.validator.js
│   │   ├── order.validator.js
│   │   └── common.validator.js    # Reusable schemas
│   │
│   ├── utils/                     # Helper utilities
│   │   ├── ApiResponse.js         # Standard response format
│   │   ├── ApiError.js            # Custom error class
│   │   ├── logger.js              # Winston logger
│   │   ├── jwt.js                 # JWT utilities
│   │   ├── encryption.js          # Bcrypt utilities
│   │   ├── validators.js          # Custom validators
│   │   └── constants.js           # App constants
│   │
│   ├── websocket/                 # Real-time features
│   │   ├── socket.js              # Socket.io setup
│   │   ├── events/                # Event emitters
│   │   │   ├── order.events.js
│   │   │   └── location.events.js
│   │   └── handlers/              # Socket event handlers
│   │       ├── order.handler.js
│   │       └── rider.handler.js
│   │
│   ├── jobs/                      # Background jobs (Bull/BullMQ)
│   │   ├── emailQueue.js          # Email sending queue
│   │   ├── orderQueue.js          # Order processing
│   │   └── notificationQueue.js   # Push notifications
│   │
│   ├── app.js                     # Express app setup
│   └── server.js                  # Server entry point
│
├── tests/                         # Test files
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── e2e/                       # End-to-end tests
│
├── docs/                          # Documentation
│   ├── api-documentation.md
│   └── database-schema.md
│
├── .env.example                   # Environment variables template
├── .env                           # Actual env (gitignored)
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── package.json
└── README.md
```

---

# 📅 DAY-BY-DAY BREAKDOWN

---

## **DAY 1: PROJECT FOUNDATION & DATABASE SCHEMA**

### **Objectives:**
- Set up complete Node.js project
- Design and implement PostgreSQL database schema
- Configure Supabase connection
- Initialize Prisma ORM

### **Files to Create (35+ files):**

**Configuration Files:**
1. `package.json` - Dependencies and scripts
2. `.env.example` - Environment variables template
3. `.gitignore` - Git ignore rules
4. `.eslintrc.json` - ESLint configuration
5. `.prettierrc` - Code formatting rules
6. `README.md` - Project documentation

**Database Files:**
7. `prisma/schema.prisma` - Complete database schema (15 tables)
8. Database migration files (auto-generated)

**Database Schema Tables:**
- users (with roles: customer, restaurant_owner, admin)
- user_addresses
- restaurants
- categories
- menu_items
- orders
- payments
- cart_items
- delivery_persons
- rider_documents
- reviews
- coupons
- coupon_usage
- notifications
- admin_logs

**Logic to Implement:**
- PostgreSQL enums (UserRole, OrderStatus, PaymentStatus, etc.)
- Table relationships (One-to-Many, Many-to-Many)
- Database indexes for performance:
  * Email, phone unique indexes
  * Geographic indexes (lat/long) for location queries
  * Composite indexes for common query patterns
  * Full-text search indexes for restaurant/menu search
- Constraints:
  * Foreign key constraints with CASCADE
  * Check constraints (rating 0-5, valid status values)
  * Unique constraints (email, phone, order_number)

**Database Functions to Create:**
- `calculate_distance(lat1, lon1, lat2, lon2)` - Haversine formula for geo queries
- `generate_order_number()` - Unique order number generator
- Triggers for auto-updating ratings when reviews are added

**Seed Data:**
- 1 Admin user
- 5 Sample customers
- 3 Restaurant owners
- 10 Restaurants (approved)
- 5 Food categories
- 50 Menu items
- 3 Delivery riders
- Sample addresses

**APIs Built:** 0 (Foundation day)

**Deliverables:**
✅ Complete project structure
✅ Database schema with 15 tables
✅ All migrations run successfully
✅ Prisma Client generated
✅ Sample data seeded
✅ Supabase connection verified

---

## **DAY 2: CORE SETUP & AUTHENTICATION FOUNDATION**

### **Objectives:**
- Set up Express.js server
- Configure all integrations (Redis, Cloudinary, Stripe)
- Build complete authentication system
- Implement JWT token management

### **Files to Create (40+ files):**

**Server Setup:**
1. `src/server.js` - Server entry point with graceful shutdown
2. `src/app.js` - Express app configuration
3. `src/routes/index.js` - Main router with API versioning

**Configuration:**
4. `src/config/database.js` - Prisma client singleton
5. `src/config/supabase.js` - Supabase client
6. `src/config/redis.js` - Redis client with reconnection logic
7. `src/config/cloudinary.js` - Cloudinary SDK setup
8. `src/config/stripe.js` - Stripe configuration
9. `src/config/index.js` - Export all configs

**Utilities:**
10. `src/utils/ApiResponse.js` - Standard response formatter
11. `src/utils/ApiError.js` - Custom error class
12. `src/utils/logger.js` - Winston logger configuration
13. `src/utils/jwt.js` - JWT utilities (generate, verify, decode)
14. `src/utils/encryption.js` - Bcrypt utilities (hash, compare)
15. `src/utils/constants.js` - App-wide constants

**Middlewares:**
16. `src/middlewares/error.middleware.js` - Global error handler
17. `src/middlewares/logger.middleware.js` - Request logger
18. `src/middlewares/rateLimiter.middleware.js` - Rate limiting
19. `src/middlewares/auth.middleware.js` - JWT verification
20. `src/middlewares/authorize.middleware.js` - Role-based access

**Authentication Service:**
21. `src/services/auth.service.js` - Authentication business logic

**Authentication Controller:**
22. `src/controllers/auth.controller.js` - Auth endpoints handler

**Authentication Routes:**
23. `src/routes/v1/auth.routes.js` - Auth API routes

**Authentication Validators:**
24. `src/validators/auth.validator.js` - Joi validation schemas

**APIs Built: 9 Authentication Endpoints**

**1. POST `/api/v1/auth/register`**
- Input: email, phone, password, fullName, role
- Validation: Email format, phone format, password strength (min 8, uppercase, lowercase, number, special char)
- Logic:
  * Check if email/phone already exists
  * Hash password with bcrypt (10 rounds)
  * Create user in database
  * Generate email verification token
  * Send verification email
  * Generate JWT access token (7 days) + refresh token (30 days)
  * Return user + tokens
- Response: { user, token, refreshToken }

**2. POST `/api/v1/auth/login`**
- Input: email/phone, password
- Logic:
  * Find user by email or phone
  * Verify password with bcrypt
  * Check if user is active
  * Update last_login_at
  * Generate JWT tokens
  * Store session in Redis (7 days TTL)
  * Return user + tokens
- Response: { user, token, refreshToken }

**3. POST `/api/v1/auth/logout`**
- Auth Required: Yes
- Logic:
  * Get token from header
  * Blacklist token in Redis
  * Delete session from Redis
  * Return success message
- Response: { message: "Logged out successfully" }

**4. POST `/api/v1/auth/verify-email`**
- Input: verification token
- Logic:
  * Verify JWT token
  * Extract user ID from token
  * Update user.isVerified = true
  * Update user.emailVerifiedAt = NOW()
  * Return success
- Response: { message: "Email verified" }

**5. POST `/api/v1/auth/resend-verification`**
- Input: email
- Rate Limited: 3 requests per hour
- Logic:
  * Find user by email
  * Check if already verified
  * Generate new verification token
  * Send verification email
  * Return success
- Response: { message: "Verification email sent" }

**6. POST `/api/v1/auth/forgot-password`**
- Input: email
- Rate Limited: 3 requests per hour
- Logic:
  * Find user by email
  * Generate password reset token (1 hour expiry)
  * Store token in Redis
  * Send reset email with link
  * Return success (always, even if email not found - security)
- Response: { message: "Reset email sent" }

**7. POST `/api/v1/auth/reset-password/:token`**
- Input: token (URL param), newPassword, confirmPassword
- Logic:
  * Verify reset token
  * Check token not expired
  * Validate password strength
  * Hash new password
  * Update user password
  * Invalidate all existing tokens
  * Delete reset token from Redis
  * Return success
- Response: { message: "Password reset successful" }

**8. POST `/api/v1/auth/refresh-token`**
- Input: refreshToken
- Logic:
  * Verify refresh token
  * Check token not blacklisted
  * Extract user ID
  * Generate new access token
  * Optionally rotate refresh token
  * Return new tokens
- Response: { token, refreshToken }

**9. PUT `/api/v1/auth/change-password`**
- Auth Required: Yes
- Input: currentPassword, newPassword, confirmPassword
- Logic:
  * Verify current password
  * Validate new password strength
  * Check new != current
  * Hash new password
  * Update in database
  * Invalidate all tokens except current
  * Return success
- Response: { message: "Password changed" }

**Key Logic Implemented:**
- Password hashing with bcrypt (10 salt rounds)
- JWT token generation (access + refresh)
- Token verification and blacklisting
- Email verification flow
- Password reset flow with expiry
- Session management with Redis
- Token refresh mechanism
- Rate limiting on sensitive endpoints

**Deliverables:**
✅ Express server running on port 5000
✅ All integrations configured
✅ 9 authentication APIs working
✅ JWT authentication implemented
✅ Redis session management
✅ Email verification system
✅ Password reset system
✅ Rate limiting active
✅ Error handling middleware
✅ Request logging

---

## **DAY 3: USER MANAGEMENT & FILE UPLOAD**

### **Objectives:**
- Build user profile management
- Implement address CRUD
- Set up Cloudinary file upload
- Create avatar upload functionality

### **Files to Create (15+ files):**

**User Service:**
1. `src/services/user.service.js` - User business logic
2. `src/services/upload.service.js` - Cloudinary integration

**User Repository:**
3. `src/repositories/user.repository.js` - User data access

**User Controller:**
4. `src/controllers/user.controller.js` - User endpoints

**User Routes:**
5. `src/routes/v1/user.routes.js` - User API routes

**User Validators:**
6. `src/validators/user.validator.js` - Validation schemas

**Upload Middleware:**
7. `src/middlewares/upload.middleware.js` - Multer configuration

**APIs Built: 12 User Management Endpoints**

**1. GET `/api/v1/users/profile`**
- Auth Required: Yes
- Logic:
  * Get user ID from JWT
  * Fetch user from database with addresses
  * Exclude password hash
  * Return user profile
- Response: { user with addresses }

**2. PUT `/api/v1/users/profile`**
- Auth Required: Yes
- Input: fullName, phone (optional)
- Validation: Name min 2 chars, valid phone format
- Logic:
  * Validate input
  * Check phone not already used by another user
  * Update user in database
  * Clear user cache in Redis
  * Return updated profile
- Response: { user }

**3. POST `/api/v1/users/avatar`**
- Auth Required: Yes
- Input: image file (multipart/form-data)
- Validation: File type (jpg, png), max size 5MB
- Logic:
  * Validate file
  * Upload to Cloudinary (folder: users/avatars)
  * Get Cloudinary URL
  * Update user.avatarUrl in database
  * Delete old avatar from Cloudinary (if exists)
  * Return new avatar URL
- Response: { avatarUrl }

**4. DELETE `/api/v1/users/avatar`**
- Auth Required: Yes
- Logic:
  * Get current avatar URL
  * Delete from Cloudinary
  * Set user.avatarUrl = null
  * Return success
- Response: { message: "Avatar deleted" }

**5. GET `/api/v1/users/addresses`**
- Auth Required: Yes
- Logic:
  * Get user ID from JWT
  * Fetch all addresses for user
  * Sort by isDefault DESC, createdAt DESC
  * Return addresses
- Response: { addresses }

**6. POST `/api/v1/users/addresses`**
- Auth Required: Yes
- Input: label, fullAddress, city, state, latitude, longitude, isDefault (optional), deliveryInstructions (optional)
- Validation: All required fields, valid coordinates
- Logic:
  * Validate input
  * If isDefault = true, set all other addresses to isDefault = false
  * Create new address
  * Return created address
- Response: { address }

**7. GET `/api/v1/users/addresses/:id`**
- Auth Required: Yes
- Logic:
  * Verify address belongs to user
  * Fetch address by ID
  * Return address
- Response: { address }

**8. PUT `/api/v1/users/addresses/:id`**
- Auth Required: Yes
- Input: Same as create (all optional)
- Logic:
  * Verify address belongs to user
  * Validate input
  * Handle isDefault logic
  * Update address
  * Return updated address
- Response: { address }

**9. DELETE `/api/v1/users/addresses/:id`**
- Auth Required: Yes
- Logic:
  * Verify address belongs to user
  * Check if address is used in any active orders
  * Delete address
  * If was default, set another address as default
  * Return success
- Response: { message: "Address deleted" }

**10. PUT `/api/v1/users/addresses/:id/default`**
- Auth Required: Yes
- Logic:
  * Verify address belongs to user
  * Set all addresses to isDefault = false
  * Set this address to isDefault = true
  * Return success
- Response: { message: "Default address updated" }

**11. GET `/api/v1/users/favorites`**
- Auth Required: Yes
- Logic:
  * Get user favorites from database
  * Fetch restaurant details
  * Return favorite restaurants
- Response: { favorites }

**12. POST `/api/v1/users/favorites/:restaurantId`**
- Auth Required: Yes
- Logic:
  * Toggle favorite (add if not exists, remove if exists)
  * Update in database
  * Return status
- Response: { isFavorite: true/false }

**Key Logic Implemented:**
- User profile CRUD operations
- Address management with default address logic
- File upload to Cloudinary
- Image validation (type, size)
- Cloudinary URL generation
- Old file deletion on update
- Authorization checks (user can only modify own data)

**Deliverables:**
✅ 12 user management APIs
✅ Cloudinary integration working
✅ Avatar upload/delete functionality
✅ Address CRUD with default logic
✅ File validation
✅ Authorization checks

---

## **DAY 4: RESTAURANT & CATEGORY MANAGEMENT**

### **Objectives:**
- Build restaurant CRUD operations
- Implement category management
- Create restaurant search with filters
- Add geo-location queries

### **Files to Create (15+ files):**

**Restaurant Service:**
1. `src/services/restaurant.service.js` - Restaurant logic
2. `src/services/location.service.js` - Geo calculations

**Restaurant Repository:**
3. `src/repositories/restaurant.repository.js` - Restaurant data access

**Restaurant Controller:**
4. `src/controllers/restaurant.controller.js` - Restaurant endpoints

**Category Controller:**
5. `src/controllers/category.controller.js` - Category endpoints

**Restaurant Routes:**
6. `src/routes/v1/restaurant.routes.js` - Restaurant routes
7. `src/routes/v1/category.routes.js` - Category routes

**Restaurant Validators:**
8. `src/validators/restaurant.validator.js` - Validation schemas

**Cache Middleware:**
9. `src/middlewares/cache.middleware.js` - Redis caching

**Cache Service:**
10. `src/services/cache.service.js` - Redis operations

**APIs Built: 16 Restaurant & Category Endpoints**

**Restaurant APIs (10 endpoints):**

**1. GET `/api/v1/restaurants`**
- Auth Required: No
- Query Parameters:
  * page (default: 1)
  * limit (default: 20, max: 100)
  * search (restaurant name or cuisine)
  * category (category ID)
  * cuisines (array of cuisines)
  * priceRange (array: $, $$, $$$, $$$$)
  * rating (minimum rating)
  * latitude, longitude (user location)
  * radius (search radius in km, default: 10)
  * sortBy (rating, distance, deliveryTime, popularity)
  * isOpen (true/false)
- Logic:
  * Build dynamic Prisma query with filters
  * If lat/long provided, calculate distance and filter by radius
  * Apply pagination
  * Apply sorting
  * Cache results in Redis (15 min TTL)
  * Return paginated restaurants with distance
- Response: { restaurants, pagination: { page, limit, total, pages } }

**2. GET `/api/v1/restaurants/:id`**
- Auth Required: No
- Cache: Yes (30 min TTL)
- Logic:
  * Fetch restaurant by ID with menu items
  * Include categories, reviews summary
  * Calculate distance if user location provided
  * Return detailed restaurant info
- Response: { restaurant with full details }

**3. GET `/api/v1/restaurants/nearby`**
- Auth Required: No
- Query: latitude, longitude, radius (default: 5km)
- Cache: Yes (10 min TTL)
- Logic:
  * Use calculate_distance PostgreSQL function
  * Filter restaurants within radius
  * Sort by distance ASC
  * Return nearby restaurants
- Response: { restaurants with distance }

**4. GET `/api/v1/restaurants/featured`**
- Auth Required: No
- Cache: Yes (1 hour TTL)
- Logic:
  * Fetch restaurants where isFeatured = true
  * Sort by rating DESC
  * Limit to 10 restaurants
  * Return featured list
- Response: { restaurants }

**5. POST `/api/v1/restaurants`**
- Auth Required: Yes (restaurant_owner role)
- Input: name, description, email, phone, fullAddress, city, state, latitude, longitude, cuisines, deliveryTimeMin, deliveryTimeMax, minimumOrder, deliveryFee
- Validation: All required fields, valid coordinates, unique slug
- Logic:
  * Generate unique slug from name
  * Upload logo/banner to Cloudinary (if provided)
  * Create restaurant with approvalStatus = 'pending'
  * Set isApproved = false
  * Send notification to admin for approval
  * Return created restaurant
- Response: { restaurant }

**6. PUT `/api/v1/restaurants/:id`**
- Auth Required: Yes (owner or admin)
- Input: Same as create (all optional)
- Authorization: Check if user is owner or admin
- Logic:
  * Verify ownership
  * Update allowed fields
  * Upload new images if provided
  * Clear restaurant cache
  * Return updated restaurant
- Response: { restaurant }

**7. DELETE `/api/v1/restaurants/:id`**
- Auth Required: Yes (owner or admin)
- Authorization: Check ownership
- Logic:
  * Check no active orders
  * Soft delete (set isActive = false) or hard delete
  * Delete images from Cloudinary
  * Clear cache
  * Return success
- Response: { message: "Restaurant deleted" }

**8. PUT `/api/v1/restaurants/:id/status`**
- Auth Required: Yes (owner)
- Input: isOpen (boolean)
- Logic:
  * Update restaurant.isOpen
  * Emit WebSocket event to notify users
  * Clear cache
  * Return status
- Response: { isOpen }

**9. POST `/api/v1/restaurants/:id/images`**
- Auth Required: Yes (owner)
- Input: images (multiple files)
- Validation: Max 5 images, valid formats
- Logic:
  * Upload images to Cloudinary
  * Add URLs to restaurant.coverImages array
  * Return image URLs
- Response: { imageUrls }

**10. GET `/api/v1/restaurants/search`**
- Auth Required: No
- Query: q (search term), filters (category, price, etc.)
- Logic:
  * Full-text search on name, description, cuisines
  * Apply filters
  * Sort by relevance
  * Cache results (10 min)
  * Return matching restaurants
- Response: { restaurants }

**Category APIs (6 endpoints):**

**11. GET `/api/v1/categories`**
- Auth Required: No
- Cache: Yes (24 hours TTL)
- Logic:
  * Fetch all active categories
  * Sort by displayOrder ASC
  * Return categories
- Response: { categories }

**12. GET `/api/v1/categories/:id`**
- Auth Required: No
- Logic:
  * Fetch category by ID
  * Return category details
- Response: { category }

**13. POST `/api/v1/categories`**
- Auth Required: Yes (admin only)
- Input: name, description, imageUrl (optional), displayOrder
- Logic:
  * Generate unique slug
  * Create category
  * Clear category cache
  * Return created category
- Response: { category }

**14. PUT `/api/v1/categories/:id`**
- Auth Required: Yes (admin)
- Input: Same as create (all optional)
- Logic:
  * Update category
  * Clear cache
  * Return updated category
- Response: { category }

**15. DELETE `/api/v1/categories/:id`**
- Auth Required: Yes (admin)
- Logic:
  * Check no menu items using this category
  * Delete category
  * Clear cache
  * Return success
- Response: { message: "Category deleted" }

**16. PUT `/api/v1/categories/reorder`**
- Auth Required: Yes (admin)
- Input: categories array with { id, displayOrder }
- Logic:
  * Update displayOrder for all categories
  * Clear cache
  * Return success
- Response: { message: "Categories reordered" }

**Key Logic Implemented:**
- Dynamic query building with Prisma
- Geographic distance calculation (Haversine formula)
- Full-text search
- Redis caching with TTL
- Cache invalidation on updates
- Pagination
- Filtering and sorting
- Image upload to Cloudinary
- Slug generation from name
- Authorization checks

**Deliverables:**
✅ 16 restaurant & category APIs
✅ Geo-location search working
✅ Redis caching implemented
✅ Full-text search functional
✅ Image upload for restaurants
✅ Dynamic filtering and sorting
✅ Cache invalidation logic

---

## **DAY 5: MENU MANAGEMENT**

### **Objectives:**
- Build menu item CRUD
- Implement menu availability toggle
- Create menu search
- Add customization options

### **Files to Create (10+ files):**

**Menu Service:**
1. `src/services/menu.service.js` - Menu business logic

**Menu Repository:**
2. `src/repositories/menu.repository.js` - Menu data access

**Menu Controller:**
3. `src/controllers/menu.controller.js` - Menu endpoints

**Menu Routes:**
4. `src/routes/v1/menu.routes.js` - Menu routes

**Menu Validators:**
5. `src/validators/menu.validator.js` - Validation schemas

**APIs Built: 10 Menu Management Endpoints**

**1. GET `/api/v1/restaurants/:restaurantId/menu`**
- Auth Required: No
- Query: category, isAvailable, search
- Cache: Yes (30 min TTL)
- Logic:
  * Fetch menu items for restaurant
  * Filter by category if provided
  * Filter by availability
  * Group by category
  * Return menu with categories
- Response: { menu items grouped by category }

**2. GET `/api/v1/menu/:id`**
- Auth Required: No
- Logic:
  * Fetch menu item by ID
  * Include restaurant info
  * Return item details
- Response: { menuItem }

**3. POST `/api/v1/restaurants/:restaurantId/menu`**
- Auth Required: Yes (restaurant owner)
- Input: name, description, categoryId, price, discountPrice (optional), preparationTime, isVegetarian, isVegan, customizations (JSON), allergens, nutritionInfo, tags
- Authorization: Verify user owns restaurant
- Validation: Valid price, preparation time > 0
- Logic:
  * Generate slug from name
  * Upload image to Cloudinary if provided
  * Create menu item
  * Clear menu cache
  * Return created item
- Response: { menuItem }

**4. PUT `/api/v1/menu/:id`**
- Auth Required: Yes (owner)
- Input: Same as create (all optional)
- Authorization: Verify ownership
- Logic:
  * Update menu item
  * Upload new image if provided
  * Clear cache
  * Return updated item
- Response: { menuItem }

**5. DELETE `/api/v1/menu/:id`**
- Auth Required: Yes (owner)
- Authorization: Verify ownership
- Logic:
  * Check not in any active carts/orders
  * Delete menu item
  * Delete image from Cloudinary
  * Clear cache
  * Return success
- Response: { message: "Menu item deleted" }

**6. PUT `/api/v1/menu/:id/availability`**
- Auth Required: Yes (owner)
- Input: isAvailable (boolean)
- Authorization: Verify ownership
- Logic:
  * Update isAvailable status
  * Clear cache
  * Notify users if in cart
  * Return status
- Response: { isAvailable }

**7. POST `/api/v1/menu/:id/image`**
- Auth Required: Yes (owner)
- Input: image file
- Authorization: Verify ownership
- Logic:
  * Upload to Cloudinary
  * Delete old image
  * Update imageUrl
  * Return new URL
- Response: { imageUrl }

**8. PUT `/api/v1/menu/bulk-availability`**
- Auth Required: Yes (owner)
- Input: menuItemIds (array), isAvailable
- Authorization: Verify all items belong to owner's restaurant
- Logic:
  * Update availability for all items
  * Clear cache
  * Return count of updated items
- Response: { updated: count }

**9. PUT `/api/v1/menu/:id/price`**
- Auth Required: Yes (owner)
- Input: price, discountPrice (optional)
- Validation: price > 0, discountPrice < price
- Logic:
  * Update pricing
  * Clear cache
  * Return updated item
- Response: { menuItem }

**10. POST `/api/v1/menu/import`**
- Auth Required: Yes (owner)
- Input: CSV file with menu items
- Logic:
  * Parse CSV
  * Validate all rows
  * Bulk create menu items
  * Return import summary
- Response: { imported: count, errors: [] }

**Key Logic Implemented:**
- Menu CRUD operations
- Bulk operations
- CSV import
- Image upload
- Availability management
- Cache invalidation
- Authorization checks

**Deliverables:**
✅ 10 menu management APIs
✅ Bulk availability update
✅ CSV import functionality
✅ Image upload for menu items
✅ Customization options support
✅ Cache management

---

## **DAY 6: CART SYSTEM**

### **Objectives:**
- Build shopping cart functionality
- Implement cart calculations
- Add coupon application
- Create cart validation

### **Files to Create (8+ files):**

**Cart Service:**
1. `src/services/cart.service.js` - Cart logic

**Cart Repository:**
2. `src/repositories/cart.repository.js` - Cart data access

**Cart Controller:**
3. `src/controllers/cart.controller.js` - Cart endpoints

**Cart Routes:**
4. `src/routes/v1/cart.routes.js` - Cart routes

**Cart Validators:**
5. `src/validators/cart.validator.js` - Validation schemas

**APIs Built: 6 Cart Management Endpoints**

**1. GET `/api/v1/cart`**
- Auth Required: Yes
- Cache: No (real-time data)
- Logic:
  * Fetch all cart items for user
  * Include menu item details, restaurant info
  * Calculate subtotal, delivery fee, tax
  * Apply coupon if exists
  * Calculate grand total
  * Return cart with calculations
- Response: { cart items, restaurant, totals }

**2. POST `/api/v1/cart/items`**
- Auth Required: Yes
- Input: menuItemId, quantity, customizations (optional)
- Validation: quantity > 0, menu item exists and available
- Logic:
  * Check menu item restaurant
  * If cart has items from different restaurant, clear cart (with confirmation)
  * Check if item already in cart
  * If exists, update quantity
  * If new, add to cart
  * Store current price (priceAtAddition)
  * Recalculate totals
  * Return updated cart
- Response: { cart }

**3. PUT `/api/v1/cart/items/:itemId`**
- Auth Required: Yes
- Input: quantity
- Validation: quantity > 0
- Authorization: Verify cart item belongs to user
- Logic:
  * Update quantity
  * Recalculate totals
  * Return updated cart
- Response: { cart }

**4. DELETE `/api/v1/cart/items/:itemId`**
- Auth Required: Yes
- Authorization: Verify ownership
- Logic:
  * Delete cart item
  * If cart empty, clear restaurant lock
  * Recalculate totals
  * Return updated cart
- Response: { cart }

**5. DELETE `/api/v1/cart/clear`**
- Auth Required: Yes
- Logic:
  * Delete all cart items for user
  * Clear any applied coupon
  * Return success
- Response: { message: "Cart cleared" }

**6. POST `/api/v1/cart/validate`**
- Auth Required: Yes
- Logic:
  * Check all items still available
  * Check prices haven't changed significantly
  * Check restaurant is open
  * Check minimum order met
  * Return validation result
- Response: { valid: true/false, issues: [] }

**Key Logic Implemented:**
- Cart item management
- Price locking (store price at time of adding)
- Restaurant locking (one restaurant per cart)
- Calculation logic:
  * Subtotal = sum(item.price * quantity)
  * Delivery fee = restaurant.deliveryFee
  * Tax = subtotal * 0.05 (5%)
  * Discount = coupon calculation
  * Total = subtotal + deliveryFee + tax - discount
- Validation before checkout
- Automatic cart clearing on restaurant change

**Deliverables:**
✅ 6 cart management APIs
✅ Cart calculations working
✅ Restaurant locking implemented
✅ Price locking at addition time
✅ Cart validation before checkout

---

## **DAY 7: ORDER SYSTEM - PART 1**

### **Objectives:**
- Build order creation logic
- Implement order status management
- Create order history
- Add order tracking

### **Files to Create (10+ files):**

**Order Service:**
1. `src/services/order.service.js` - Order processing

**Order Repository:**
2. `src/repositories/order.repository.js` - Order data access

**Order Controller:**
3. `src/controllers/order.controller.js` - Order endpoints

**Order Routes:**
4. `src/routes/v1/order.routes.js` - Order routes

**Order Validators:**
5. `src/validators/order.validator.js` - Validation schemas

**Order Queue:**
6. `src/jobs/orderQueue.js` - Background order processing

**APIs Built: 10 Order Management Endpoints**

**1. POST `/api/v1/orders`**
- Auth Required: Yes
- Input: deliveryAddressId, paymentMethod, specialInstructions, couponCode (optional)
- Logic:
  * Validate cart not empty
  * Validate delivery address belongs to user
  * Validate restaurant is open
  * Calculate order totals from cart
  * Apply coupon if valid
  * Generate unique order number (ORD-YYYYMMDD-XXXX)
  * Create order with status = 'pending'
  * Create payment record
  * Clear cart
  * Send notification to restaurant
  * Send confirmation email to customer
  * Add to order processing queue
  * Return created order
- Response: { order }

**2. GET `/api/v1/orders`**
- Auth Required: Yes
- Query: page, limit, status, dateFrom, dateTo
- Logic:
  * Fetch orders for user
  * Apply filters
  * Paginate results
  * Sort by createdAt DESC
  * Return orders
- Response: { orders, pagination }

**3. GET `/api/v1/orders/:id`**
- Auth Required: Yes
- Authorization: Verify order belongs to user (or user is restaurant/rider/admin)
- Logic:
  * Fetch order with all relations
  * Include restaurant, items, payment, rider info
  * Return detailed order
- Response: { order with full details }

**4. PUT `/api/v1/orders/:id/cancel`**
- Auth Required: Yes
- Input: reason
- Authorization: Verify ownership
- Business Rules:
  * Can only cancel if status = 'pending' or 'confirmed'
  * Cannot cancel if status = 'preparing' or beyond
- Logic:
  * Update status to 'cancelled'
  * Set cancelledBy = 'customer'
  * Set cancellationReason
  * Set cancelledAt timestamp
  * Process refund if payment was completed
  * Notify restaurant and rider
  * Return updated order
- Response: { order }

**5. GET `/api/v1/orders/:id/track`**
- Auth Required: Yes
- Authorization: Verify ownership
- Logic:
  * Fetch order with rider location (if assigned)
  * Calculate estimated delivery time
  * Return tracking info with timeline
- Response: { status, timeline, riderLocation, estimatedTime }

**6. GET `/api/v1/orders/active`**
- Auth Required: Yes
- Logic:
  * Fetch orders where status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivering')
  * Return active orders
- Response: { orders }

**7. PUT `/api/v1/orders/:id/status`** (Restaurant/Rider/Admin)
- Auth Required: Yes (restaurant owner, rider, or admin)
- Input: status
- Authorization: 
  * Restaurant can update: confirmed, preparing, ready
  * Rider can update: picked_up, delivering, delivered
  * Admin can update: any status
- Logic:
  * Validate status transition is allowed
  * Update order status
  * Update relevant timestamp (readyAt, pickedUpAt, etc.)
  * Notify customer of status change
  * Emit WebSocket event
  * Return updated order
- Response: { order }

**8. POST `/api/v1/orders/:id/review`**
- Auth Required: Yes
- Input: rating (1-5), comment, foodRating, serviceRating, deliveryRating, images (optional)
- Authorization: Verify order belongs to user
- Business Rules: Can only review delivered orders, one review per order
- Logic:
  * Validate order status = 'delivered'
  * Create review
  * Update restaurant rating (via trigger)
  * Update rider rating (if rated)
  * Notify restaurant of review
  * Return created review
- Response: { review }

**9. POST `/api/v1/orders/:id/reorder`**
- Auth Required: Yes
- Authorization: Verify order belongs to user
- Logic:
  * Fetch order items
  * Validate all items still available
  * Clear current cart
  * Add all items to cart
  * Return cart
- Response: { cart }

**10. GET `/api/v1/orders/stats`** (for user dashboard)
- Auth Required: Yes
- Logic:
  * Count total orders
  * Count completed orders
  * Count cancelled orders
  * Calculate total spent
  * Return statistics
- Response: { totalOrders, completed, cancelled, totalSpent }

**Key Logic Implemented:**
- Order number generation
- Order status state machine
- Status transition validation
- Timestamp tracking for each status
- Notification on status change
- WebSocket events for real-time updates
- Refund processing on cancellation
- Review system

**Deliverables:**
✅ 10 order management APIs
✅ Order creation from cart
✅ Status management
✅ Order tracking
✅ Review system
✅ Reorder functionality

---

## **DAY 8: PAYMENT INTEGRATION (STRIPE)**

### **Objectives:**
- Integrate Stripe payment gateway
- Build payment intent creation
- Implement payment confirmation
- Add refund processing

### **Files to Create (8+ files):**

**Payment Service:**
1. `src/services/payment.service.js` - Stripe integration

**Payment Controller:**
2. `src/controllers/payment.controller.js` - Payment endpoints

**Payment Routes:**
3. `src/routes/v1/payment.routes.js` - Payment routes

**Payment Validators:**
4. `src/validators/payment.validator.js` - Validation

**Webhook Handler:**
5. `src/webhooks/stripe.webhook.js` - Stripe webhooks

**APIs Built: 7 Payment Endpoints + 1 Webhook**

**1. POST `/api/v1/payments/create-intent`**
- Auth Required: Yes
- Input: orderId
- Authorization: Verify order belongs to user
- Logic:
  * Fetch order
  * Create Stripe Payment Intent
  * Store payment intent ID in payment record
  * Return client secret for frontend
- Response: { clientSecret, paymentIntentId }

**2. POST `/api/v1/payments/confirm`**
- Auth Required: Yes
- Input: paymentIntentId
- Logic:
  * Verify payment intent with Stripe
  * Update payment status to 'completed'
  * Update order paymentStatus to 'completed'
  * Set paidAt timestamp
  * Send payment confirmation email
  * Return payment details
- Response: { payment }

**3. GET `/api/v1/payments/:id`**
- Auth Required: Yes
- Authorization: Verify payment belongs to user's order
- Logic:
  * Fetch payment with order info
  * Return payment details
- Response: { payment }

**4. POST `/api/v1/payments/refund`**
- Auth Required: Yes (admin)
- Input: paymentId, amount (optional - full or partial), reason
- Logic:
  * Fetch payment
  * Create refund in Stripe
  * Update payment status to 'refunded'
  * Update order status to 'cancelled'
  * Store refund details
  * Notify customer
  * Return refund info
- Response: { refund }

**5. GET `/api/v1/payments/methods`**
- Auth Required: Yes
- Logic:
  * Fetch saved payment methods from Stripe
  * Return list of payment methods
- Response: { paymentMethods }

**6. POST `/api/v1/payments/methods`**
- Auth Required: Yes
- Input: paymentMethodId (from Stripe.js)
- Logic:
  * Attach payment method to customer
  * Save in Stripe
  * Return saved method
- Response: { paymentMethod }

**7. DELETE `/api/v1/payments/methods/:id`**
- Auth Required: Yes
- Logic:
  * Detach payment method from customer
  * Delete from Stripe
  * Return success
- Response: { message: "Payment method removed" }

**8. POST `/api/v1/webhooks/stripe`** (Webhook)
- Auth: Stripe signature verification
- Logic:
  * Verify webhook signature
  * Handle events:
    - payment_intent.succeeded
    - payment_intent.payment_failed
    - charge.refunded
  * Update payment and order status accordingly
  * Send notifications
  * Return 200 OK
- Response: { received: true }

**Key Logic Implemented:**
- Stripe Payment Intent creation
- Payment confirmation
- Webhook event handling
- Refund processing (full and partial)
- Payment method management
- Signature verification for webhooks
- Payment status synchronization

**Deliverables:**
✅ 7 payment APIs + webhook
✅ Stripe integration complete
✅ Payment flow working
✅ Refund system
✅ Webhook handling
✅ Saved payment methods

---

## **DAY 9: RIDER SYSTEM - PART 1**

### **Objectives:**
- Build rider registration
- Implement document verification
- Create rider profile management
- Add vehicle information

### **Files to Create (10+ files):**

**Rider Service:**
1. `src/services/rider.service.js` - Rider management

**Rider Repository:**
2. `src/repositories/rider.repository.js` - Rider data access

**Rider Controller:**
3. `src/controllers/rider.controller.js` - Rider endpoints

**Rider Routes:**
4. `src/routes/v1/rider.routes.js` - Rider routes

**Rider Validators:**
5. `src/validators/rider.validator.js` - Validation

**APIs Built: 12 Rider Management Endpoints**

**1. POST `/api/v1/rider/auth/register`**
- Auth Required: No
- Input: email, phone, password, fullName, dateOfBirth, cnicNumber, vehicleType, vehicleNumber, licenseNumber, licenseExpiry
- Logic:
  * Create user account (role: customer)
  * Create delivery_person record
  * Set verificationStatus = 'pending'
  * Send verification email
  * Return registration success
- Response: { user, deliveryPerson }

**2. GET `/api/v1/rider/profile`**
- Auth Required: Yes (rider)
- Logic:
  * Fetch rider profile
  * Include user info, documents, stats
  * Return profile
- Response: { riderProfile }

**3. PUT `/api/v1/rider/profile`**
- Auth Required: Yes (rider)
- Input: Any profile fields (phone, vehicle info, bank details)
- Logic:
  * Update rider profile
  * Return updated profile
- Response: { riderProfile }

**4. POST `/api/v1/rider/documents/upload`**
- Auth Required: Yes (rider)
- Input: documentType, file
- Validation: documentType enum, valid file format
- Logic:
  * Upload document to Cloudinary/Supabase Storage
  * Create or update rider_document record
  * Set verificationStatus = 'pending'
  * Notify admin for verification
  * Return document info
- Response: { document }

**5. GET `/api/v1/rider/documents`**
- Auth Required: Yes (rider)
- Logic:
  * Fetch all rider documents
  * Return documents with verification status
- Response: { documents }

**6. PUT `/api/v1/rider/availability`**
- Auth Required: Yes (rider)
- Input: isAvailable (boolean)
- Logic:
  * Update rider availability
  * If going offline, check no active deliveries
  * Return status
- Response: { isAvailable }

**7. PUT `/api/v1/rider/online-status`**
- Auth Required: Yes (rider)
- Input: isOnline (boolean)
- Logic:
  * Update online status
  * If going offline, update location
  * Notify dispatch system
  * Return status
- Response: { isOnline }

**8. GET `/api/v1/rider/stats`**
- Auth Required: Yes (rider)
- Logic:
  * Get total deliveries
  * Get completed deliveries
  * Calculate acceptance rate
  * Calculate on-time rate
  * Get current rating
  * Return statistics
- Response: { stats }

**9. GET `/api/v1/rider/ratings`**
- Auth Required: Yes (rider)
- Logic:
  * Fetch all reviews for rider
  * Calculate average rating
  * Return reviews with pagination
- Response: { reviews, averageRating, pagination }

**10. POST `/api/v1/rider/vehicle`**
- Auth Required: Yes (rider)
- Input: vehicleType, vehicleNumber, vehicleMake, vehicleModel, vehicleColor
- Logic:
  * Update vehicle information
  * Upload vehicle photo if provided
  * Return updated info
- Response: { vehicleInfo }

**11. PUT `/api/v1/rider/bank-details`**
- Auth Required: Yes (rider)
- Input: bankAccountName, bankAccountNumber, bankName
- Validation: Valid account number format
- Logic:
  * Update bank details for payouts
  * Return success
- Response: { message: "Bank details updated" }

**12. GET `/api/v1/rider/verification-status`**
- Auth Required: Yes (rider)
- Logic:
  * Check verification status of all documents
  * Check overall approval status
  * Return status summary
- Response: { overallStatus, documents: [] }

**Key Logic Implemented:**
- Rider registration flow
- Document upload to cloud storage
- Multi-step verification process
- Vehicle information management
- Bank details for payouts
- Availability and online status management
- Statistics calculation

**Deliverables:**
✅ 12 rider management APIs
✅ Document upload system
✅ Vehicle management
✅ Bank details for payouts
✅ Status management
✅ Statistics tracking

---

## **DAY 10: DELIVERY SYSTEM & LOCATION TRACKING**

### **Objectives:**
- Build delivery assignment logic
- Implement location tracking
- Create delivery status updates
- Add earnings calculation

### **Files to Create (8+ files):**

**Delivery Service:**
1. `src/services/delivery.service.js` - Delivery logic

**Delivery Controller:**
2. `src/controllers/delivery.controller.js` - Delivery endpoints

**Delivery Routes:**
3. `src/routes/v1/delivery.routes.js` - Delivery routes

**Location WebSocket Handler:**
4. `src/websocket/handlers/location.handler.js` - Real-time location

**APIs Built: 10 Delivery Management Endpoints**

**1. GET `/api/v1/rider/deliveries/available`**
- Auth Required: Yes (rider)
- Query: latitude, longitude
- Logic:
  * Fetch orders with status = 'ready' and riderId = null
  * Calculate distance from rider location
  * Sort by distance, priority
  * Return available deliveries
- Response: { deliveries }

**2. POST `/api/v1/rider/deliveries/:id/accept`**
- Auth Required: Yes (rider)
- Authorization: Check rider is online and available
- Business Rules: Rider can only have 1 active delivery
- Logic:
  * Check order not already assigned
  * Assign order to rider
  * Update order status to 'picked_up' (or custom status)
  * Update rider availability
  * Notify customer and restaurant
  * Calculate earnings for this delivery
  * Return delivery details
- Response: { delivery }

**3. PUT `/api/v1/rider/deliveries/:id/decline`**
- Auth Required: Yes (rider)
- Logic:
  * Log decline
  * Update acceptance rate
  * Make order available for other riders
  * Return success
- Response: { message: "Delivery declined" }

**4. PUT `/api/v1/rider/deliveries/:id/arrive-restaurant`**
- Auth Required: Yes (rider)
- Authorization: Verify delivery assigned to rider
- Logic:
  * Update order status to specific state
  * Record arrival time
  * Notify restaurant
  * Return success
- Response: { order }

**5. PUT `/api/v1/rider/deliveries/:id/pickup`**
- Auth Required: Yes (rider)
- Authorization: Verify assignment
- Input: verificationCode (from restaurant)
- Logic:
  * Verify code
  * Update order status to 'picked_up'
  * Set pickedUpAt timestamp
  * Start delivery tracking
  * Notify customer
  * Return order
- Response: { order }

**6. POST `/api/v1/rider/location/update`**
- Auth Required: Yes (rider)
- Input: latitude, longitude, accuracy, speed, heading
- Rate Limited: Max 1 request per 10 seconds
- Logic:
  * Update rider current location
  * Update lastLocationUpdate timestamp
  * Broadcast to WebSocket (customer tracking)
  * Calculate ETA if delivery active
  * Return success
- Response: { message: "Location updated" }

**7. PUT `/api/v1/rider/deliveries/:id/arrive-customer`**
- Auth Required: Yes (rider)
- Logic:
  * Update status
  * Notify customer of arrival
  * Return order
- Response: { order }

**8. PUT `/api/v1/rider/deliveries/:id/complete`**
- Auth Required: Yes (rider)
- Input: verificationCode (from customer), proofOfDelivery (image), notes, cashCollected (if COD)
- Logic:
  * Verify code
  * Upload proof of delivery image
  * Update order status to 'delivered'
  * Set deliveredAt timestamp
  * Update rider stats (completedDeliveries++)
  * Calculate earnings and add to rider account
  * Update rider availability (isAvailable = true)
  * Send delivery confirmation to customer
  * Return completed order
- Response: { order, earnings }

**9. GET `/api/v1/rider/deliveries/history`**
- Auth Required: Yes (rider)
- Query: page, limit, dateFrom, dateTo
- Logic:
  * Fetch completed deliveries
  * Paginate results
  * Return delivery history
- Response: { deliveries, pagination }

**10. POST `/api/v1/rider/deliveries/:id/issue`**
- Auth Required: Yes (rider)
- Input: issueType, description, images
- Logic:
  * Create issue report
  * Notify admin
  * Return issue ID
- Response: { issue }

**Key Logic Implemented:**
- Order assignment to riders
- Distance-based delivery matching
- Location tracking with WebSocket
- ETA calculation
- Delivery proof upload
- Earnings calculation per delivery
- Acceptance rate tracking
- Multi-step delivery flow

**Deliverables:**
✅ 10 delivery management APIs
✅ Real-time location tracking
✅ Delivery assignment logic
✅ Proof of delivery system
✅ Earnings calculation
✅ Issue reporting

---

## **DAY 11: EARNINGS & PAYOUT SYSTEM**

### **Objectives:**
- Build earnings tracking
- Implement payout management
- Create earnings analytics
- Add transaction history

### **Files to Create (6+ files):**

**Earnings Service:**
1. `src/services/earnings.service.js` - Earnings logic

**Files to Create:** ~6 files

**APIs Built: 8 Earnings & Payout Endpoints**

**1. GET `/api/v1/rider/earnings/summary`**
- Auth Required: Yes (rider)
- Logic:
  * Calculate today's earnings
  * Calculate week's earnings
  * Calculate month's earnings
  * Get pending payout amount
  * Return summary
- Response: { today, week, month, pending }

**2. GET `/api/v1/rider/earnings/today`**
- Auth Required: Yes (rider)
- Logic:
  * Fetch today's completed deliveries
  * Calculate earnings with breakdown
  * Return details
- Response: { totalEarnings, deliveries, tips, bonuses }

**3. GET `/api/v1/rider/earnings/trips`**
- Auth Required: Yes (rider)
- Query: page, limit, dateFrom, dateTo
- Logic:
  * Fetch all trips with earnings
  * Calculate per-trip earnings
  * Paginate results
  * Return trip history
- Response: { trips, totalEarnings, pagination }

**4. GET `/api/v1/rider/earnings/breakdown`**
- Auth Required: Yes (rider)
- Query: period (week, month, year)
- Logic:
  * Calculate earnings breakdown
  * Group by day/week/month
  * Return chart data
- Response: { breakdown by period }

**5. GET `/api/v1/rider/payouts/pending`**
- Auth Required: Yes (rider)
- Logic:
  * Calculate total pending payout
  * Show breakdown (delivery fees, tips, bonuses)
  * Return details
- Response: { pending amount, breakdown }

**6. POST `/api/v1/rider/payouts/request`**
- Auth Required: Yes (rider)
- Business Rules: Minimum payout amount PKR 1000
- Logic:
  * Validate bank details exist
  * Validate minimum amount
  * Create payout request
  * Update status to 'pending'
  * Notify admin
  * Return payout request
- Response: { payoutRequest }

**7. GET `/api/v1/rider/payouts/history`**
- Auth Required: Yes (rider)
- Query: page, limit
- Logic:
  * Fetch payout history
  * Show status (pending, processing, completed)
  * Return history
- Response: { payouts, pagination }

**8. GET `/api/v1/rider/payouts/:id`**
- Auth Required: Yes (rider)
- Logic:
  * Fetch payout details
  * Include transaction info
  * Return details
- Response: { payout }

**Key Logic Implemented:**
- Earnings calculation per delivery
- Tips tracking
- Bonuses and incentives
- Payout request system
- Transaction history
- Minimum payout threshold

**Deliverables:**
✅ 8 earnings & payout APIs
✅ Earnings tracking
✅ Payout system
✅ Transaction history
✅ Analytics

---

## **DAY 12: SEARCH & FILTER SYSTEM**

### **Objectives:**
- Build advanced search
- Implement filters
- Add search caching
- Create search suggestions

### **Files to Create (8+ files):**

**Search Service:**
1. `src/services/search.service.js` - Search logic

**Search Controller:**
2. `src/controllers/search.controller.js` - Search endpoints

**Search Routes:**
3. `src/routes/v1/search.routes.js` - Search routes

**APIs Built: 6 Search & Filter Endpoints**

**1. GET `/api/v1/search/restaurants`**
- Auth Required: No
- Query: q (search term), filters (JSON), sort, page, limit
- Cache: Yes (10 min TTL)
- Logic:
  * Full-text search on name, description, cuisines
  * Apply filters (category, price, rating, etc.)
  * Sort by relevance, rating, distance
  * Cache results
  * Return matching restaurants
- Response: { restaurants, totalResults, pagination }

**2. GET `/api/v1/search/menu-items`**
- Auth Required: No
- Query: q, restaurantId (optional), filters
- Cache: Yes
- Logic:
  * Search menu items by name, description, tags
  * Filter by category, price, dietary preferences
  * Return matching items with restaurant info
- Response: { menuItems, totalResults }

**3. GET `/api/v1/search/suggestions`**
- Auth Required: No
- Query: q (partial search term)
- Cache: Yes (5 min TTL)
- Logic:
  * Generate autocomplete suggestions
  * Search in restaurants, cuisines, popular dishes
  * Return top 10 suggestions
- Response: { suggestions }

**4. GET `/api/v1/search/popular`**
- Auth Required: No
- Cache: Yes (1 hour TTL)
- Logic:
  * Get popular search terms
  * Get trending restaurants
  * Return popular searches
- Response: { popularSearches, trending }

**5. POST `/api/v1/search/save`** (for logged-in users)
- Auth Required: Yes
- Input: searchTerm
- Logic:
  * Save search to user's history
  * Limit to last 10 searches
  * Return success
- Response: { message: "Search saved" }

**6. GET `/api/v1/search/history`**
- Auth Required: Yes
- Logic:
  * Fetch user's search history
  * Return last 10 searches
- Response: { searchHistory }

**Key Logic Implemented:**
- Full-text search with PostgreSQL
- Multi-field search
- Search result caching
- Autocomplete suggestions
- Search history
- Popular searches tracking

**Deliverables:**
✅ 6 search APIs
✅ Full-text search working
✅ Autocomplete suggestions
✅ Search caching
✅ Search history

---

## **DAY 13: REVIEW & RATING SYSTEM**

### **Objectives:**
- Build review CRUD
- Implement rating aggregation
- Add review moderation
- Create helpful vote system

### **Files to Create (6+ files):**

**Review Service:**
1. `src/services/review.service.js` - Review logic

**Review Controller:**
2. `src/controllers/review.controller.js` - Review endpoints

**Review Routes:**
3. `src/routes/v1/review.routes.js` - Review routes

**APIs Built: 7 Review Management Endpoints**

**1. GET `/api/v1/restaurants/:restaurantId/reviews`**
- Auth Required: No
- Query: page, limit, sort (recent, helpful, rating)
- Logic:
  * Fetch restaurant reviews
  * Include customer info
  * Sort by requested criteria
  * Paginate results
  * Return reviews
- Response: { reviews, averageRating, pagination }

**2. POST `/api/v1/restaurants/:restaurantId/reviews`**
- Auth Required: Yes
- Input: orderId, rating (1-5), comment, foodRating, serviceRating, deliveryRating, images
- Validation: Rating 1-5, valid order, not already reviewed
- Logic:
  * Verify order was delivered
  * Create review
  * Update restaurant rating (trigger)
  * Update rider rating if reviewed
  * Notify restaurant
  * Return created review
- Response: { review }

**3. PUT `/api/v1/reviews/:id`**
- Auth Required: Yes
- Authorization: Verify review belongs to user
- Input: rating, comment, images
- Logic:
  * Update review
  * Recalculate restaurant rating
  * Return updated review
- Response: { review }

**4. DELETE `/api/v1/reviews/:id`**
- Auth Required: Yes
- Authorization: Verify ownership or admin
- Logic:
  * Delete review
  * Recalculate restaurant rating
  * Return success
- Response: { message: "Review deleted" }

**5. POST `/api/v1/reviews/:id/helpful`**
- Auth Required: Yes
- Logic:
  * Toggle helpful vote
  * Increment/decrement helpfulCount
  * Return status
- Response: { isHelpful: true/false }

**6. POST `/api/v1/reviews/:id/reply`** (Restaurant owner)
- Auth Required: Yes (restaurant owner)
- Input: reply text
- Authorization: Verify user owns restaurant
- Logic:
  * Add reply to review
  * Notify customer
  * Return updated review
- Response: { review }

**7. PUT `/api/v1/reviews/:id/flag`** (Report inappropriate)
- Auth Required: Yes
- Input: reason
- Logic:
  * Flag review for moderation
  * Notify admin
  * Return success
- Response: { message: "Review flagged" }

**Key Logic Implemented:**
- Review CRUD operations
- Automatic rating aggregation (database trigger)
- Helpful vote system
- Restaurant owner replies
- Review moderation/flagging
- Image upload for reviews

**Deliverables:**
✅ 7 review APIs
✅ Rating aggregation
✅ Helpful vote system
✅ Owner reply feature
✅ Review moderation

---

## **DAY 14: ADMIN APIS & NOTIFICATIONS**

### **Objectives:**
- Build admin dashboard APIs
- Implement notification system
- Create analytics endpoints
- Add admin actions

### **Files to Create (12+ files):**

**Admin Controller:**
1. `src/controllers/admin.controller.js` - Admin endpoints

**Admin Routes:**
2. `src/routes/v1/admin.routes.js` - Admin routes

**Notification Service:**
3. `src/services/notification.service.js` - Push/Email/SMS

**APIs Built: 20 Admin & Notification Endpoints**

**Admin APIs (15 endpoints):**

**1. GET `/api/v1/admin/dashboard`**
- Auth Required: Yes (admin)
- Logic:
  * Get total users, restaurants, orders, riders
  * Get today's stats
  * Get revenue summary
  * Get pending approvals count
  * Return dashboard data
- Response: { stats, todayStats, pendingApprovals }

**2. GET `/api/v1/admin/users`**
- Auth Required: Yes (admin)
- Query: page, limit, search, role, status
- Logic:
  * Fetch all users with filters
  * Paginate results
  * Return users
- Response: { users, pagination }

**3. PUT `/api/v1/admin/users/:id/status`**
- Auth Required: Yes (admin)
- Input: isActive
- Logic:
  * Update user status
  * If blocking, cancel active orders/deliveries
  * Log admin action
  * Return updated user
- Response: { user }

**4. GET `/api/v1/admin/restaurants/pending`**
- Auth Required: Yes (admin)
- Logic:
  * Fetch restaurants with approvalStatus = 'pending'
  * Return pending restaurants
- Response: { restaurants }

**5. PUT `/api/v1/admin/restaurants/:id/approve`**
- Auth Required: Yes (admin)
- Logic:
  * Update isApproved = true
  * Set approvalStatus = 'approved'
  * Set approvedBy and approvedAt
  * Send approval email to owner
  * Log admin action
  * Return restaurant
- Response: { restaurant }

**6. PUT `/api/v1/admin/restaurants/:id/reject`**
- Auth Required: Yes (admin)
- Input: reason
- Logic:
  * Update approvalStatus = 'rejected'
  * Set rejectionReason
  * Send rejection email
  * Log action
  * Return restaurant
- Response: { restaurant }

**7. GET `/api/v1/admin/riders/pending`**
- Logic: Fetch pending rider verifications
- Response: { riders }

**8. PUT `/api/v1/admin/riders/:id/verify-document`**
- Input: documentId, status, rejectionReason
- Logic: Update document verification status
- Response: { document }

**9. GET `/api/v1/admin/orders`**
- Logic: Fetch all orders with filters
- Response: { orders, pagination }

**10. GET `/api/v1/admin/analytics/revenue`**
- Query: dateFrom, dateTo, groupBy (day/week/month)
- Logic: Calculate revenue analytics
- Response: { revenue breakdown }

**11-15. Additional admin endpoints:**
- Analytics endpoints (orders, users, restaurants)
- Payout management
- Coupon management
- System settings

**Notification APIs (5 endpoints):**

**16. GET `/api/v1/notifications`**
- Auth Required: Yes
- Logic:
  * Fetch user notifications
  * Mark as delivered
  * Return notifications
- Response: { notifications }

**17. PUT `/api/v1/notifications/:id/read`**
- Logic: Mark notification as read
- Response: { message: "Marked as read" }

**18. PUT `/api/v1/notifications/read-all`**
- Logic: Mark all as read
- Response: { message: "All marked as read" }

**19. DELETE `/api/v1/notifications/:id`**
- Logic: Delete notification
- Response: { message: "Deleted" }

**20. PUT `/api/v1/notifications/preferences`**
- Input: email, push, sms preferences
- Logic: Update notification preferences
- Response: { preferences }

**Key Logic Implemented:**
- Admin dashboard statistics
- User management
- Restaurant approval workflow
- Rider verification
- Analytics calculations
- Push notification sending
- Email notification templates
- SMS notification sending
- Notification preferences

**Deliverables:**
✅ 20 admin & notification APIs
✅ Dashboard statistics
✅ Approval workflows
✅ Push notifications
✅ Email system
✅ Admin action logging

---

## **DAY 15: REAL-TIME FEATURES & FINAL POLISH**

### **Objectives:**
- Implement WebSocket events
- Build real-time order tracking
- Add real-time notifications
- Final testing and optimization

### **Files to Create (10+ files):**

**WebSocket Setup:**
1. `src/websocket/socket.js` - Socket.io configuration

**Event Handlers:**
2. `src/websocket/handlers/order.handler.js` - Order events
3. `src/websocket/handlers/rider.handler.js` - Rider location events

**Event Emitters:**
4. `src/websocket/events/order.events.js` - Order event emitters
5. `src/websocket/events/location.events.js` - Location event emitters

**WebSocket Events Implemented:**

**Order Events:**
- `order:new` - New order created (→ restaurant)
- `order:status_changed` - Status updated (→ customer, restaurant, rider)
- `order:accepted` - Restaurant accepted (→ customer)
- `order:ready` - Order ready for pickup (→ rider)
- `order:picked_up` - Rider picked up (→ customer)
- `order:delivered` - Order delivered (→ customer, restaurant)
- `order:cancelled` - Order cancelled (→ all parties)

**Rider Location Events:**
- `rider:location_update` - Location update (→ customer tracking order)
- `rider:online` - Rider came online (→ dispatch system)
- `rider:offline` - Rider went offline

**Notification Events:**
- `notification:new` - New notification (→ user)

**Connection Logic:**
- JWT authentication on connection
- Join user-specific rooms (user:userId)
- Join role-specific rooms (role:customer, role:rider, etc.)
- Join order-specific rooms (order:orderId)
- Leave rooms on disconnect

**Final Tasks:**

**Testing:**
- Test all 100+ API endpoints
- Test WebSocket connections
- Test real-time features
- Load testing with k6 or Artillery

**Optimization:**
- Add database indexes where needed
- Optimize slow queries
- Implement query result caching
- Optimize image delivery

**Documentation:**
- Complete API documentation (Swagger)
- Update README
- Document deployment process
- Create environment setup guide

**Security Checklist:**
- Rate limiting on all endpoints
- Input validation on all endpoints
- SQL injection prevention
- XSS prevention
- CSRF tokens for sensitive operations
- Secure headers (helmet)

**Deliverables:**
✅ WebSocket implementation complete
✅ Real-time order tracking working
✅ Real-time notifications functional
✅ All 100+ APIs tested
✅ Performance optimized
✅ Security hardened
✅ Documentation complete
✅ Production-ready backend

---

# 📊 FINAL STATISTICS

**Total Files Created:** 200+ files
**Total APIs Built:** 100+ RESTful endpoints
**Database Tables:** 15 tables
**WebSocket Events:** 10+ real-time events
**Services:** 15+ service modules
**Middlewares:** 8+ middleware functions
**Validators:** 10+ validation schemas

**API Breakdown:**
- Authentication: 9 endpoints
- User Management: 12 endpoints
- Restaurant Management: 16 endpoints
- Menu Management: 10 endpoints
- Cart System: 6 endpoints
- Order System: 10 endpoints
- Payment System: 8 endpoints
- Rider System: 24 endpoints
- Search System: 6 endpoints
- Review System: 7 endpoints
- Admin System: 20 endpoints
- Notifications: 5 endpoints
- **Total: 133 endpoints**

---

# 🎯 SUCCESS CRITERIA

✅ All APIs functional and tested
✅ Database optimized with indexes
✅ Redis caching implemented
✅ File upload working (Cloudinary)
✅ Payment integration complete (Stripe)
✅ Real-time features working (Socket.io)
✅ Authentication & authorization secure
✅ Email/SMS notifications functional
✅ Admin dashboard APIs complete
✅ Documentation comprehensive
✅ Code quality high (ESLint passing)
✅ Performance optimized
✅ Security hardened
✅ Ready for production deployment

---

**This is your complete 15-day roadmap to build a production-ready, scalable food delivery backend! 🚀**