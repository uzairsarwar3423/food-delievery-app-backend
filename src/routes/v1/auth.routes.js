// =============================================================
// src/routes/v1/auth.routes.js — v1 Authentication Routes
// =============================================================

const express = require('express');
const authController = require('../../controllers/auth.controller');
const validate = require('../../middlewares/validate.middleware');
const {
  registerValidator,
  loginValidator,
  sendOtpValidator,
  verifyOtpValidator,
  googleLoginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require('../../validators/auth.validator');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authLimiter, otpLimiter } = require('../../middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * Public Authentication Routes
 */
router.post('/register', validate(registerValidator), authController.register);
router.post('/login', authLimiter, validate(loginValidator), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

/**
 * Simplified Authentication (Phone OTP & Social)
 */
router.post('/otp/send', otpLimiter, validate(sendOtpValidator), authController.sendOTP);
router.post('/otp/verify', authLimiter, validate(verifyOtpValidator), authController.verifyOTP);
router.post('/google', authLimiter, validate(googleLoginValidator), authController.googleLogin);

/**
 * Public Email Discovery / Action Routes
 */
router.post('/verify-email', otpLimiter, validate(verifyEmailValidator), authController.verifyEmail);
router.post('/resend-verification', otpLimiter, validate(resendVerificationValidator), authController.resendVerification);
router.post('/forgot-password', otpLimiter, validate(forgotPasswordValidator), authController.forgotPassword);
router.post('/reset-password/:token', otpLimiter, validate(resetPasswordValidator), authController.resetPassword);

/**
 * Protected Authentication Routes
 */
router.put('/change-password', authenticate, validate(changePasswordValidator), authController.changePassword);

module.exports = router;
