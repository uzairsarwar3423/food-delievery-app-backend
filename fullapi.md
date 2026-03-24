# Food Delivery App - Full API Documentation

This document provides a comprehensive list of all API endpoints available in the Food Delivery Backend, including their parameters, security requirements, and expected responses.

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Users & Profile](#2-users--profile)
3. [Restaurants](#3-restaurants)
4. [Categories](#4-categories)
5. [Menu Items](#5-menu-items)
6. [Cart](#6-cart)
7. [Orders](#7-orders)
8. [Payments](#8-payments)
9. [Rider Management](#9-rider-management)
10. [Delivery Operations](#10-delivery-operations)
11. [Search](#11-search)
12. [Reviews](#12-reviews)
13. [Notifications](#13-notifications)
14. [Admin Panel](#14-admin-panel)

---

## 1. Authentication
**Base Path:** `/api/v1/auth`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| POST | `/register` | Register a new user | **Body:** `email`, `password`, `firstName`, `lastName` |
| POST | `/login` | User login | **Body:** `email`, `password` |
| POST | `/refresh-token` | Refresh access token | **Body:** `refreshToken` |
| POST | `/logout` | Logout user | **Body:** `refreshToken` |
| POST | `/verify-email` | Verify user email | **Body:** `token` |
| POST | `/resend-verification` | Resend verification email | **Body:** `email` |
| POST | `/forgot-password` | Request password reset | **Body:** `email` |
| POST | `/reset-password/{token}` | Reset password | **Path:** `token`, **Body:** `password` |
| PUT | `/change-password` | Change user password | **Security:** Bearer, **Body:** `currentPassword`, `newPassword` |

---

## 2. Users & Profile
**Base Path:** `/api/v1/users`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/profile` | Get current user profile | **Security:** Bearer |
| PUT | `/profile` | Update user profile | **Security:** Bearer, **Body:** `firstName`, `lastName`, `phone` |
| POST | `/avatar` | Upload user avatar | **Security:** Bearer, **Body (Multipart):** `avatar` (file) |
| DELETE | `/avatar` | Delete user avatar | **Security:** Bearer |
| GET | `/addresses` | Get all user addresses | **Security:** Bearer |
| POST | `/addresses` | Add a new address | **Security:** Bearer, **Body:** `label`, `fullAddress`, `city`, `state`, `postalCode`, `isDefault`, `deliveryInstructions` |
| GET | `/addresses/{id}` | Get address by ID | **Security:** Bearer, **Path:** `id` (UUID) |
| PUT | `/addresses/{id}` | Update an address | **Security:** Bearer, **Path:** `id`, **Body:** `label`, `fullAddress`, etc. |
| DELETE | `/addresses/{id}` | Delete an address | **Security:** Bearer, **Path:** `id` |
| PUT | `/addresses/{id}/default` | Set address as default | **Security:** Bearer, **Path:** `id` |
| GET | `/favorites` | Get favorite restaurants | **Security:** Bearer |
| POST | `/favorites/{restaurantId}`| Toggle restaurant favorite | **Security:** Bearer, **Path:** `restaurantId` |

---

## 3. Restaurants
**Base Path:** `/api/v1/restaurants`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/` | Get all restaurants | **Query:** `page`, `limit`, `search`, `category`, `cuisines`, `rating`, `sortBy` (rating, distance, deliveryTime, popularity, relevance), `isOpen` (boolean) |
| POST | `/` | Create a new restaurant | **Security:** Bearer, **Body (Multipart):** `name`, `addressLine1`, `city`, `phone`, `email`, `logo`, `banner` |
| GET | `/nearby` | Get nearby restaurants | **Query:** `latitude`, `longitude` (Required) |
| GET | `/{id}` | Get restaurant by ID | **Path:** `id` (UUID) |
| PUT | `/{id}` | Update restaurant | **Security:** Bearer, **Path:** `id` |
| DELETE | `/{id}` | Delete restaurant | **Security:** Bearer, **Path:** `id` |

---

## 4. Categories
**Base Path:** `/api/v1/categories`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/` | Get all categories | - |
| POST | `/` | Create category | **Security:** Bearer, **Body (Multipart):** `name`, `description`, `imageUrl` |
| GET | `/{id}` | Get category by ID | **Path:** `id` (UUID) |
| PUT | `/{id}` | Update category | **Security:** Bearer, **Path:** `id` |
| DELETE | `/{id}` | Delete category | **Security:** Bearer, **Path:** `id` |

---

## 5. Menu Items
**Base Path:** `/api/v1`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/restaurants/{restaurantId}/menu` | Get restaurant menu | **Path:** `restaurantId` |
| POST | `/restaurants/{restaurantId}/menu` | Create menu item | **Security:** Bearer, **Path:** `restaurantId`, **Body (Multipart):** `name`, `price`, `categoryId`, `image` |
| GET | `/menu/{id}` | Get menu item by ID | **Path:** `id` (UUID) |
| PUT | `/menu/{id}` | Update menu item | **Security:** Bearer, **Path:** `id` |
| DELETE | `/menu/{id}` | Delete menu item | **Security:** Bearer, **Path:** `id` |
| PUT | `/menu/bulk-availability` | Bulk update availability | **Security:** Bearer, **Body:** `itemIds` (array), `isAvailable` (boolean) |

---

## 6. Cart
**Base Path:** `/api/v1/cart`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/` | Fetch cart | **Security:** Bearer |
| POST | `/items` | Add item to cart | **Security:** Bearer, **Body:** `menuItemId`, `quantity` |
| PUT | `/items/{itemId}` | Update cart item | **Security:** Bearer, **Path:** `itemId`, **Body:** `quantity` |
| DELETE | `/items/{itemId}` | Remove item from cart | **Security:** Bearer, **Path:** `itemId` |
| DELETE | `/clear` | Clear cart | **Security:** Bearer |

---

## 7. Orders
**Base Path:** `/api/v1/orders`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/` | List order history | **Security:** Bearer, **Query:** `page`, `limit` |
| POST | `/` | Place a new order | **Security:** Bearer, **Body:** `restaurantId`, `deliveryAddressId`, `paymentMethod`, `items` (array) |
| GET | `/active` | Get active orders | **Security:** Bearer |
| GET | `/stats` | Get order stats | **Security:** Bearer |
| GET | `/{id}` | Get order details | **Security:** Bearer, **Path:** `id` |
| PUT | `/{id}/cancel` | Cancel order | **Security:** Bearer, **Path:** `id` |
| PUT | `/{id}/status` | Update order status | **Security:** Bearer, **Path:** `id`, **Body:** `status` (Enum) |

---

## 8. Payments
**Base Path:** `/api/v1/payments`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/history` | Get payment history | **Security:** Bearer |
| POST | `/create` | Create a payment | **Security:** Bearer, **Body:** `orderId`, `method` (CASH, JAZZCASH, etc.) |
| GET | `/{id}` | Get payment by ID | **Security:** Bearer, **Path:** `id` |
| GET | `/order/{orderId}` | Get payment by order ID | **Security:** Bearer, **Path:** `orderId` |

---

## 9. Rider Management
**Base Path:** `/api/v1/rider`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| POST | `/auth/register` | Register as a rider | **Body:** `firstName`, `lastName`, `email`, `password`, `phone`, `vehicleType`, `vehicleNumber` |
| GET | `/profile` | Get rider profile | **Security:** Bearer |
| PUT | `/profile` | Update rider profile | **Security:** Bearer, **Body:** `phone`, `vehicleType`, `bankDetails`, etc. |
| GET | `/earnings/summary` | Get earnings summary | **Security:** Bearer |
| GET | `/earnings/today` | Today's earnings details | **Security:** Bearer |
| GET | `/earnings/trips` | Trip history with earnings | **Security:** Bearer, **Query:** `page`, `limit`, `dateFrom`, `dateTo` |
| GET | `/earnings/breakdown`| Earnings breakdown (chart) | **Security:** Bearer, **Query:** `period` (week, month, year) |
| GET | `/payouts/pending` | Get pending payout amount | **Security:** Bearer |
| POST | `/payouts/request` | Request a payout | **Security:** Bearer, **Body:** `amount` (Min 1000) |
| GET | `/payouts/history` | Payout request history | **Security:** Bearer, **Query:** `page`, `limit` |
| GET | `/payouts/{id}` | Get payout details | **Security:** Bearer, **Path:** `id` |

---

## 10. Delivery Operations
**Base Path:** `/api/v1/rider`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/deliveries/available` | Get available deliveries | **Security:** Bearer, **Query:** `latitude`, `longitude` |
| POST | `/deliveries/{id}/accept` | Accept delivery | **Security:** Bearer, **Path:** `id` |
| PUT | `/deliveries/{id}/decline`| Decline delivery | **Security:** Bearer, **Path:** `id` |
| PUT | `/deliveries/{id}/arrive-restaurant` | Arrive at restaurant | **Security:** Bearer, **Path:** `id` |
| PUT | `/deliveries/{id}/pickup` | Pickup delivery | **Security:** Bearer, **Path:** `id`, **Body:** `verificationCode` |
| PUT | `/deliveries/{id}/arrive-customer` | Arrive at customer | **Security:** Bearer, **Path:** `id` |
| PUT | `/deliveries/{id}/complete` | Complete delivery | **Security:** Bearer, **Path:** `id`, **Body (Multipart):** `verificationCode`, `proofOfDelivery` (file) |
| GET | `/deliveries/history` | Delivery history | **Security:** Bearer |
| POST | `/deliveries/{id}/issue`| Report delivery issue | **Security:** Bearer, **Path:** `id`, **Body:** `issueType`, `description`, `images` |
| POST | `/location/update` | Update rider location | **Security:** Bearer, **Body:** `latitude`, `longitude`, `accuracy`, `speed`, `heading` |

---

## 11. Search
**Base Path:** `/api/v1/search`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/restaurants` | Search for restaurants | **Query:** `q`, `filters` (JSON string), `sort`, `page`, `limit` |
| GET | `/menu-items` | Search for menu items | **Query:** `q`, `restaurantId`, `filters` |
| GET | `/suggestions` | Get search suggestions | **Query:** `q` (Required) |
| GET | `/popular` | Popular & Trending data | - |
| POST | `/save` | Save search history | **Security:** Bearer, **Body:** `searchTerm` |
| GET | `/history` | Get user search history | **Security:** Bearer |

---

## 12. Reviews
**Base Path:** `/api/v1`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/restaurants/{restaurantId}/reviews` | Get reviews | **Path:** `restaurantId`, **Query:** `page`, `limit` |
| POST | `/restaurants/{restaurantId}/reviews` | Create review | **Security:** Bearer, **Path:** `restaurantId`, **Body:** `orderId`, `restaurantRating`, `foodRating`, `comment`, `images` |
| PUT | `/reviews/{id}` | Update a review | **Security:** Bearer, **Path:** `id`, **Body:** `restaurantRating`, `comment`, etc. |
| DELETE | `/reviews/{id}` | Delete a review | **Security:** Bearer, **Path:** `id` |
| POST | `/reviews/{id}/helpful` | Toggle helpful vote | **Security:** Bearer, **Path:** `id` |
| POST | `/reviews/{id}/reply` | Add reply (Owner) | **Security:** Bearer, **Path:** `id`, **Body:** `reply` |
| PUT | `/reviews/{id}/flag` | Flag/Report a review | **Security:** Bearer, **Path:** `id`, **Body:** `reason` |

---

## 13. Notifications
**Base Path:** `/api/v1/notifications`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/` | Fetch user notifications | **Security:** Bearer, **Query:** `page`, `limit` |
| PUT | `/preferences` | Update preferences | **Security:** Bearer, **Body:** `pushEnabled`, `emailEnabled`, etc. |
| PUT | `/read-all` | Mark all as read | **Security:** Bearer |
| PUT | `/{id}/read` | Mark as read | **Security:** Bearer, **Path:** `id` |
| DELETE | `/{id}` | Delete notification | **Security:** Bearer, **Path:** `id` |

---

## 14. Admin Panel
**Base Path:** `/api/v1/admin`

| Method | Endpoint | Summary | Parameters |
| :--- | :--- | :--- | :--- |
| GET | `/dashboard` | Dashboard Statistics | **Security:** Bearer (Admin) |
| GET | `/users` | List all users | **Security:** Bearer (Admin), **Query:** `role`, `isActive`, `search` |
| PUT | `/users/{id}/status` | Update user status | **Security:** Bearer (Admin), **Path:** `id`, **Body:** `isActive` |
| GET | `/restaurants/pending`| Pending approvals | **Security:** Bearer (Admin) |
| PUT | `/restaurants/{id}/approve`| Approve restaurant | **Security:** Bearer (Admin), **Path:** `id` |
| PUT | `/restaurants/{id}/reject`| Reject restaurant | **Security:** Bearer (Admin), **Path:** `id`, **Body:** `reason` |
| GET | `/riders/pending` | Pending rider verifications | **Security:** Bearer (Admin) |
| PUT | `/riders/documents/{id}/verify`| Verify rider document | **Security:** Bearer (Admin), **Path:** `id`, **Body:** `status`, `rejectionReason` |
| GET | `/orders` | List all orders | **Security:** Bearer (Admin), **Query:** `status`, `restaurantId`, `riderId` |
| GET | `/analytics/revenue`| Revenue analytics | **Security:** Bearer (Admin), **Query:** `period`, `startDate`, `endDate` |
| GET | `/analytics/orders` | Order analytics | **Security:** Bearer (Admin), **Query:** `period` |
| GET | `/analytics/users` | User analytics | **Security:** Bearer (Admin), **Query:** `period` |
| GET | `/analytics/restaurants`| Restaurant analytics | **Security:** Bearer (Admin) |
| PUT | `/settings` | Update system settings | **Security:** Bearer (Admin), **Body:** `serviceFee`, `minOrderAmount`, etc. |
| POST | `/coupons` | Create new coupon | **Security:** Bearer (Admin), **Body:** `code`, `discountType`, `value`, `expiryDate` |
| PUT | `/payouts/{id}/process`| Process rider payout | **Security:** Bearer (Admin), **Path:** `id`, **Body:** `status`, `adminNotes`, `transactionId` |
