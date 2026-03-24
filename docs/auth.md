# Authentication API Documentation

This document describes all authentication-related endpoints for the Food Delivery Backend.

**Base URL**: `http://localhost:5000/api/v1/auth`

---

## 🔑 Authentication Overview

Most protected routes in this API require a **JWT Access Token**.  
- **Header**: `Authorization: Bearer <access_token>`
- **Refresh Strategy**: Use the `/refresh-token` endpoint to obtain a new access token when the current one expires.

---

## 🛠 Standard Response Formats

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Description of the error",
  "errors": [] 
}
```

---

## 🚀 Endpoints

### 1. User Registration
`POST /register`  
Registers a new user account.

**Request Body:**
| Parameter | Type | Required | Validation / Description |
| :--- | :--- | :--- | :--- |
| `email` | String | Yes | Valid email format. Must be unique. |
| `phone` | String | Yes | E.164 format (e.g., +923001234567). Must be unique. |
| `password` | String | Yes | Min 8 chars. Must include 1 upper, 1 lower, 1 number, 1 special char. |
| `firstName` | String | Yes | Max 100 characters. |
| `lastName` | String | Yes | Max 100 characters. |
| `role` | String | No | Enum: `CUSTOMER` (default), `RESTAURANT_OWNER`, `DELIVERY_PERSON`. |

**Success Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": { "id": "...", "email": "...", "role": "...", "isEmailVerified": false, ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### 2. User Login
`POST /login`  
Authenticates a user and returns tokens. Sets a `refreshToken` as an HTTP-only cookie.

**Request Body:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `identifier` | String | Yes | Email or Phone number. |
| `password` | String | Yes | User's account password. |

**Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged in successfully",
  "data": {
    "user": { "id": "...", "email": "...", "role": "...", ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### 3. Refresh Token
`POST /refresh-token`  
Generates a new access token using a valid refresh token.

**Request Body:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `refreshToken` | String | No* | Can be provided in body or via HTTP-only cookie. |

**Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### 4. Logout
`POST /logout`  
Invalidates the current session by blacklisting the access token and removing the refresh token.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `refreshToken` | String | No* | Can be provided in body or via cookie. |

**Success Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": null
}
```

---

### 5. Email Verification
`POST /verify-email`  
Verifies a user's email address using a token.

**Request Body:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | String | Yes | The verification token sent to the user's email. |

---

### 6. Resend Verification Email
`POST /resend-verification`  
Resends the verification email to the user.

**Request Body:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | Yes | The registered email address. |

---

### 7. Forgot Password
`POST /forgot-password`  
Initiates a password reset flow by sending a reset link via email.

**Request Body:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | Yes | The registered email address. |

---

### 8. Reset Password
`POST /reset-password/:token`  
Resets the password using the token from the email.

**Path Parameters:**
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `token` | String | The reset token from the email link. |

**Request Body:**
| Parameter | Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `password` | String | Yes | New password (standard complexity required). |
| `confirmPassword` | String | Yes | Must match `password`. |

---

### 9. Change Password
`PUT /change-password`  
Updates the password for an already logged-in user.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
| Parameter | Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `currentPassword` | String | Yes | Existing password. |
| `newPassword` | String | Yes | New password (cannot be same as current). |
| `confirmPassword` | String | Yes | Must match `newPassword`. |
