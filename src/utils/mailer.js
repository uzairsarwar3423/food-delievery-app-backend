// =============================================================
// src/utils/mailer.js — Nodemailer Email Utility
// =============================================================

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter = null;

/**
 * Get (or create) the mail transporter singleton
 */
const getTransporter = () => {
  if (transporter) {return transporter;}

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const config = {
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  };

  if (smtpHost === 'smtp.gmail.com') {
    config.service = 'gmail';
  } else {
    config.host = smtpHost;
    config.port = parseInt(process.env.SMTP_PORT, 10) || 587;
    config.secure = process.env.SMTP_SECURE === 'true';
    config.tls = {
      rejectUnauthorized: false,
    };
  }

  transporter = nodemailer.createTransport(config);

  return transporter;
};

/**
 * Send an email
 * @param {Object} options
 * @param {string} options.to         - Recipient email
 * @param {string} options.subject    - Email subject
 * @param {string} options.html       - HTML body
 * @param {string} [options.text]     - Plain text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || '"Food Delivery" <noreply@fooddelivery.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`, {
      stack: err.stack,
      code: err.code,
      command: err.command,
    });
    // Don't throw — email failures should not break auth flows
    // But return null to let caller know
    return null;
  }
};

// ─── Email Templates ─────────────────────────────────────────

/**
 * Send email verification link
 */
const sendVerificationEmail = async (email, fullName, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  return sendEmail({
    to: email,
    subject: '✅ Verify Your Email — Food Delivery',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #FF6B35; padding: 30px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .body { padding: 40px 30px; }
    .body p { color: #555; line-height: 1.6; }
    .btn { display: inline-block; background: #FF6B35; color: #fff !important; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🍕 Food Delivery</h1></div>
    <div class="body">
      <h2>Hello, ${fullName}! 👋</h2>
      <p>Welcome to Food Delivery! Please verify your email address to activate your account.</p>
      <p style="text-align:center;">
        <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      </p>
      <p>This link expires in <strong>24 hours</strong>.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p style="word-break:break-all; font-size:12px; color:#aaa;">Or copy this URL: ${verifyUrl}</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} Food Delivery. All rights reserved.</div>
  </div>
</body>
</html>`,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, fullName, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password/${token}`;

  return sendEmail({
    to: email,
    subject: '🔐 Reset Your Password — Food Delivery',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #FF6B35; padding: 30px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .body { padding: 40px 30px; }
    .body p { color: #555; line-height: 1.6; }
    .btn { display: inline-block; background: #FF6B35; color: #fff !important; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin-top: 20px; color: #856404; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🍕 Food Delivery</h1></div>
    <div class="body">
      <h2>Password Reset Request</h2>
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <p style="text-align:center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </p>
      <div class="warning">
        ⚠️ This link expires in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email and your password will remain unchanged.
      </div>
      <p style="word-break:break-all; font-size:12px; color:#aaa; margin-top:16px;">Or copy this URL: ${resetUrl}</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} Food Delivery. All rights reserved.</div>
  </div>
</body>
</html>`,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
