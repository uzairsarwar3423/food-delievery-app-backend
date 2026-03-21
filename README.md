# 🍔 Food Delivery Backend API

A production-ready, scalable REST API for a food delivery platform built with **Node.js**, **Express**, **PostgreSQL (Supabase)**, **Prisma ORM**, **Redis**, **Cloudinary**, and **Socket.io**.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express.js |
| Database | PostgreSQL via Supabase Cloud |
| ORM | Prisma |
| Cache / Sessions | Redis (ioredis) |
| Media Storage | Cloudinary |
| Auth | JWT (Access + Refresh tokens) |
| Real-time | Socket.io |
| Logging | Winston + Daily Rotate |
| Validation | express-validator |

---

## 📁 Project Structure

```
food-delivery-backend/
├── prisma/
│   ├── schema.prisma          # 15-table database schema
│   └── seed.js                # Sample data seeder
├── src/
│   ├── config/
│   │   ├── database.js        # Prisma client singleton
│   │   ├── redis.js           # Redis client + cache helpers
│   │   ├── cloudinary.js      # Cloudinary + Multer config
│   │   └── logger.js          # Winston logger
│   ├── middlewares/
│   │   ├── auth.middleware.js     # JWT auth + role check
│   │   ├── errorHandler.js        # Global error handler
│   │   ├── validate.middleware.js # Input validation
│   │   └── rateLimiter.middleware.js
│   ├── modules/               # Feature modules (added per day)
│   │   ├── auth/
│   │   ├── users/
│   │   ├── restaurants/
│   │   ├── orders/
│   │   └── ...
│   ├── utils/
│   │   ├── ApiError.js        # Custom error class
│   │   ├── ApiResponse.js     # Standardized responses
│   │   ├── asyncHandler.js    # Async route wrapper
│   │   └── helpers.js         # Utility functions
│   ├── app.js                 # Express app setup
│   └── server.js              # HTTP + Socket.io entry point
├── .env.example
├── .eslintrc.json
├── .prettierrc
└── package.json
```

---

## 🗄️ Database Schema (15 Tables)

| # | Table | Description |
|---|---|---|
| 1 | `users` | Customers, owners, riders, admins |
| 2 | `user_addresses` | Saved delivery addresses |
| 3 | `categories` | Food categories |
| 4 | `restaurants` | Restaurant listings |
| 5 | `menu_items` | Food items per restaurant |
| 6 | `cart_items` | User shopping cart |
| 7 | `orders` | Order records |
| 8 | `order_items` | Line items per order |
| 9 | `payments` | Payment records |
| 10 | `delivery_persons` | Rider profiles |
| 11 | `rider_documents` | Verification documents |
| 12 | `reviews` | Restaurant/food ratings |
| 13 | `coupons` | Promo codes |
| 14 | `coupon_usage` | Coupon audit trail |
| 15 | `notifications` | In-app notifications |
| + | `admin_logs` | Admin action audit log |

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Fill in your Supabase, Redis, Cloudinary credentials
```

### 3. Run Database Migration

```bash
npm run db:migrate
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Seed Sample Data

```bash
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

---

## 🔑 Test Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@fooddelivery.pk | Admin@123456 |
| Customer | ali.khan@gmail.com | Customer@123 |
| Restaurant Owner | owner1@burgerlab.pk | Owner@123456 |
| Delivery Rider | rider1@delivery.pk | Rider@123456 |

---

## 📋 API Development Roadmap

| Day | Focus | Status |
|---|---|---|
| Day 1 | Project Foundation & Database Schema | ✅ |
| Day 2 | Authentication & User Management | 🔜 |
| Day 3 | Restaurant & Menu Management | 🔜 |
| Day 4 | Orders & Cart System | 🔜 |
| Day 5 | Payments & Delivery | 🔜 |
| Day 6 | Reviews, Coupons & Notifications | 🔜 |
| Day 7 | Admin Panel & Analytics | 🔜 |

---

## 📡 Health Check

```
GET /health
```

```json
{
  "status": "ok",
  "app": "Food Delivery API",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-03-19T12:00:00.000Z",
  "uptime": "42s"
}
```

---

## 🧩 Environment Variables

See [`.env.example`](.env.example) for the full list of required environment variables.

---

## 📜 License

MIT
