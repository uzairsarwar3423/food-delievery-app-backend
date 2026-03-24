# Food Delivery API Documentation

## Overview
This is the complete REST API documentation for the Food Delivery Backend. Built with Node.js, Express, Prisma, PostgreSQL (Supabase), Redis, and Socket.io for real-time features.

**Base URL**: `http://localhost:5000/api/v1` (development)

**Interactive Docs**: Visit `/api-docs` after starting the server for Swagger UI.

**Authentication**: JWT Bearer tokens. Include `Authorization: Bearer <access_token>` in headers for protected routes. Use refresh tokens to get new access tokens.

## Quick Start Integration Guide

### 1. Clone & Install
```bash
git clone <repo>
cd food-delivery-backend
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure:
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
CLOUDINARY_URL=...
STRIPE_SECRET_KEY=...
SUPABASE_URL=...
```

### 3. Database Setup
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Run Server
```bash
npm run dev  # Development with nodemon
# or
npm start    # Production
```

### 5. Test APIs
- **Swagger UI**: http://localhost:5000/api-docs
- **Postman Collection**: Import from [here](#postman) or use cURL examples below
- **Health Check**: `GET /health`

### 6. Real-time Features (WebSocket)
Connect to `ws://localhost:5000` for order updates, rider location, notifications.

## Authentication (Auth)

All protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Register new user | No |
| `POST` | `/auth/login` | Login user | No |
| `POST` | `/auth/refresh-token` | Refresh access token | No |
| `POST` | `/auth/logout` | Logout (invalidate refresh) | No |
| `POST` | `/auth/verify-email` | Verify email | No |
| `POST` | `/auth/resend-verification` | Resend verification | No |
| `POST` | `/auth/forgot-password` | Request password reset | No |
| `POST` | `/auth/reset-password/{token}` | Reset password | No |
| `PUT` | `/auth/change-password` | Change password | Yes |

**Register Example**:
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    \"email\": \"user@example.com\",
    \"password\": \"password123\",
    \"firstName\": \"John\",
    \"lastName\": \"Doe\"
  }'
```

**Login Response**:
```json
{
  \"tokens\": {
    \"accessToken\": \"eyJ...\", 
    \"refreshToken\": \"eyJ...\"
  },
  \"user\": { ... }
}
```

## Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/users/profile` | Get profile | Yes |
| `PUT` | `/users/profile` | Update profile | Yes |
| `POST` | `/users/avatar` | Upload avatar (multipart) | Yes |
| `DELETE` | `/users/avatar` | Delete avatar | Yes |
| `GET` | `/users/addresses` | List addresses | Yes |
| `POST` | `/users/addresses` | Add address | Yes |
| `GET` | `/users/addresses/{id}` | Get address | Yes |
| `PUT` | `/users/addresses/{id}` | Update address | Yes |
| `DELETE` | `/users/addresses/{id}` | Delete address | Yes |
| `PUT` | `/users/addresses/{id}/default` | Set default | Yes |
| `GET` | `/users/favorites` | List favorites | Yes |
| `POST` | `/users/favorites/{restaurantId}` | Toggle favorite | Yes |

**Add Address Example**:
```json
{
  \"label\": \"Home\",
  \"fullAddress\": \"123 Main St\",
  \"city\": \"Lahore\",
  \"state\": \"Punjab\",
  \"postalCode\": \"54000\"
}
```

## Restaurants

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/restaurants` | List restaurants (?page=1&limit=10) | No |
| `POST` | `/restaurants` | Create restaurant (multipart) | Yes |
| `GET` | `/restaurants/nearby?lat=...&lng=...` | Nearby restaurants | No |
| `GET` | `/restaurants/{id}` | Get restaurant | No |
| `PUT` | `/restaurants/{id}` | Update | Yes |
| `DELETE` | `/restaurants/{id}` | Delete | Yes |

## Menu & Categories

**Categories**:
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/categories` | List | No |
| `POST` | `/categories` | Create (multipart) | Yes |
| `GET` | `/categories/{id}` | Get | No |
| `PUT` | `/categories/{id}` | Update | Yes |
| `DELETE` | `/categories/{id}` | Delete | Yes |

**Menu**:
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/restaurants/{restaurantId}/menu` | Get menu | No |
| `POST` | `/restaurants/{restaurantId}/menu` | Add item (multipart) | Yes |
| `GET` | `/menu/{id}` | Get item | No |
| `PUT` | `/menu/{id}` | Update | Yes |
| `DELETE` | `/menu/{id}` | Delete | Yes |
| `PUT` | `/menu/bulk-availability` | Bulk availability | Yes |

**Bulk Availability**:
```json
{
  \"itemIds\": [\"uuid1\", \"uuid2\"],
  \"isAvailable\": true
}
```

## Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/orders` | History (?page&limit) | Yes |
| `POST` | `/orders` | Place order | Yes |
| `GET` | `/orders/active` | Active orders | Yes |
| `GET` | `/orders/stats` | Stats | Yes |
| `GET` | `/orders/{id}` | Details | Yes |
| `PUT` | `/orders/{id}/cancel` | Cancel | Yes |
| `PUT` | `/orders/{id}/status` | Update status | Yes |

**Place Order**:
```json
{
  \"restaurantId\": \"uuid\",
  \"deliveryAddressId\": \"uuid\",
  \"paymentMethod\": \"CASH\",
  \"items\": [
    {\"menuItemId\": \"uuid\", \"quantity\": 2}
  ]
}
```

## Cart

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/cart` | Fetch cart | Yes |
| `POST` | `/cart/items` | Add item | Yes |
| `PUT` | `/cart/items/{itemId}` | Update quantity | Yes |
| `DELETE` | `/cart/items/{itemId}` | Remove | Yes |
| `DELETE` | `/cart/clear` | Clear cart | Yes |

## Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/payments/history` | History | Yes |
| `POST` | `/payments/create` | Create payment | Yes |
| `GET` | `/payments/{id}` | Get payment | Yes |
| `GET` | `/payments/order/{orderId}` | By order | Yes |

**Methods**: CASH, JAZZCASH, EASYPAISA, CREDIT_CARD, DEBIT_CARD, WALLET, UPI

**Create**:
```json
{
  \"orderId\": \"uuid\",
  \"method\": \"JAZZCASH\"
}
```

## Riders/Delivery

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/rider/auth/register` | Rider signup | No |
| `GET` | `/rider/profile` | Profile | Yes |
| `PUT` | `/rider/profile` | Update | Yes |
| `GET` | `/rider/deliveries/available` | Available | Yes |
| `POST` | `/rider/deliveries/{id}/accept` | Accept | Yes |
| `POST` | `/rider/location/update` | Update location | Yes |

**Location Update**:
```json
{
  \"latitude\": 31.5204,
  \"longitude\": 74.3587
}
```

## Other Features

- **Search**: `/search?q=burger` (likely in search.yaml)
- **Reviews**: Post/review restaurant/menu items
- **Earnings/Payouts**: For riders/restaurants (earnings.yaml)
- **Notifications**: Push via WebSocket/email
- **Admin**: Dashboard endpoints (admin.yaml)

## Error Handling
All errors return:
```json
{
  \"success\": false,
  \"message\": \"Error description\",
  \"statusCode\": 400,
  \"error\": {...}
}
```
Common codes: 400 (Validation), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Server Error)

## WebSocket (Real-time)
Connect with Socket.io client:
```js
const socket = io('http://localhost:5000');
socket.emit('join-user', userId);
socket.on('order-update', (data) => { ... });
```
Events: order.events, location.events, notification.events.

## Testing with cURL/Postman
1. Get token via login
2. Add `Authorization: Bearer {{token}}` to headers
3. Use Swagger for examples

## Rate Limiting
All endpoints rate-limited (express-rate-limit).

## Security
- JWT authentication
- Input validation (express-validator/Joi)
- Helmet headers
- CORS configured
- bcrypt password hashing
- Cloudinary for uploads

For full OpenAPI spec, check `src/docs/*.yaml` or Swagger UI.

---
*Generated from project OpenAPI specs v1.0.0*

