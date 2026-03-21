// =============================================================
// src/controllers/auth.controller.js — Auth Controller
// =============================================================

const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Handle HTTP requests for authentication
 */
class AuthController {
  /**
     * POST /register
     */
  register = asyncHandler(async (req, res) => {
    const { user, tokens } = await authService.register(req.body);

    // Optionally set HTTP-only cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return ApiResponse.created(res, { user, ...tokens }, 'User registered successfully. Please verify your email.');
  });

  /**
     * POST /login
     */
  login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const { user, tokens } = await authService.login(identifier, password);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return ApiResponse.success(res, { user, ...tokens }, 'Logged in successfully');
  });

  /**
     * POST /logout
     */
  logout = asyncHandler(async (req, res) => {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    await authService.logout(accessToken, refreshToken);

    res.clearCookie('refreshToken');
    return ApiResponse.success(res, null, 'Logged out successfully');
  });

  /**
     * POST /verify-email
     */
  verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;
    await authService.verifyEmail(token);
    return ApiResponse.success(res, null, 'Email verified successfully');
  });

  /**
     * POST /resend-verification
     */
  resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await authService.resendVerification(email);
    return ApiResponse.success(res, null, 'Verification email sent if user exists');
  });

  /**
     * POST /forgot-password
     */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await authService.forgotPassword(email);
    return ApiResponse.success(res, null, 'Password reset instructions sent');
  });

  /**
     * POST /reset-password/:token
     */
  resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    await authService.resetPassword(token, password);
    return ApiResponse.success(res, null, 'Password reset successfully');
  });

  /**
     * POST /refresh-token
     */
  refreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const tokens = await authService.refreshToken(token);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return ApiResponse.success(res, tokens, 'Token refreshed successfully');
  });

  /**
     * PUT /change-password
     */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    return ApiResponse.success(res, null, 'Password changed successfully. Please log in again.');
  });
}

module.exports = new AuthController();
