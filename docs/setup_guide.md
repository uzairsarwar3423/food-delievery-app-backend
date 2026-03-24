# 🛠️ Environment Setup Guide

This guide provides step-by-step instructions for setting up the Food Delivery Backend on your local machine.

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher (or a Supabase account)
- **Redis**: v6.0 or higher (or a Redis Cloud account)
- **Cloudinary Account**: For image storage and optimization

## 🚀 Step-by-Step Installation

### 1. Clone & Install
```bash
git clone <repository-url>
cd food-delivery-backend
npm install
```

### 2. Configure Environment Variables
Copy the example environment file and fill in the required values:
```bash
cp .env.example .env
```

### 3. Database Setup (Prisma)
The project uses Prisma ORM with PostgreSQL.

- **Migration**: Run `npx prisma migrate dev` to create the database schema.
- **Client Generation**: Run `npx prisma generate` to generate the Prisma client.
- **Seeding**: Run `npx prisma db seed` to populate the database with sample data (users, restaurants, menus).

### 4. Redis Configuration
Redis is used for caching and sessions. 

- **Local**: Install Redis and ensure it's running on `localhost:6379`.
- **Cloud**: Provide the `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` in your `.env`.

### 5. Cloudinary Setup
1. Create a free account at [Cloudinary](https://cloudinary.com/).
2. Get your **Cloud Name**, **API Key**, and **API Secret** from the dashboard.
3. Add these to your `.env` file under the `CLOUDINARY_*` prefix.

## 🧪 Running Tests

The project uses Jest for integration and unit testing.

### Run All Tests
```bash
npm test
```

### Run Specific Test
```bash
npm test src/routes/v1/__tests__/order.test.js
```

## 🔍 Troubleshooting

- **Prisma Connection Error**: Double-check your `DATABASE_URL` and `DIRECT_URL`. Ensure you're using the correct port (usually 5432 or 6543 for pooling).
- **Redis Connection Refused**: Ensure the Redis server is started or that your cloud credentials are correct.
- **Validation Errors**: Ensure you're sending requests according to the Swagger documentation.
