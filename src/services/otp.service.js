// =============================================================
// src/services/otp.service.js — Email OTP Service
// =============================================================

const { cacheSet, cacheGet, cacheDel } = require('../config/redis');
const { REDIS_KEYS, TOKEN_TTL } = require('../utils/constants');
const logger = require('../config/logger');
const { sendEmail } = require('../utils/mailer');

class OTPService {
  /**
   * Generates a 6-digit OTP, stores it in Redis, and sends it
   * to the given email address via Gmail SMTP.
   * @param {string} email
   * @returns {Promise<string>} The generated OTP (returned for dev/testing)
   */
  async sendOTP(email) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `${REDIS_KEYS.PHONE_OTP}${email}`;

    // Store in Redis with TTL (5 minutes)
    await cacheSet(key, otp, TOKEN_TTL.PHONE_OTP);

    // Send via Gmail SMTP
    const sent = await sendEmail({
      to: email,
      subject: '🔑 Your FoodHunger Verification Code',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #F97316, #ea580c); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 26px; letter-spacing: -0.5px; }
    .body { padding: 40px 32px; text-align: center; }
    .body p { color: #555; line-height: 1.6; margin: 0 0 20px; }
    .otp-box { display: inline-block; background: #fff7ed; border: 2px dashed #F97316; border-radius: 10px; padding: 20px 40px; margin: 24px 0; }
    .otp-code { font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #F97316; font-family: monospace; }
    .note { font-size: 13px; color: #999; margin-top: 24px; }
    .footer { background: #f9fafb; text-align: center; padding: 16px; color: #aaa; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🍕 FoodHunger</h1></div>
    <div class="body">
      <h2 style="color:#1a1a1a;margin-bottom:8px;">Verify your email</h2>
      <p>Use the code below to sign in to your FoodHunger account.</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p class="note">This code expires in <strong>5 minutes</strong>.<br>If you didn't request this, please ignore this email.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} FoodHunger. All rights reserved.</div>
  </div>
</body>
</html>`,
    });

    if (sent) {
      logger.info(`OTP email sent to ${email}`);
    } else {
      logger.warn(`OTP email failed to send to ${email} — running in dev mode, OTP: ${otp}`);
    }

    return otp; // Returned for dev/test inspection
  }

  /**
   * Verifies the provided OTP for the given email.
   * Deletes the code from Redis on success to prevent reuse.
   * @param {string} email
   * @param {string} code
   * @returns {Promise<boolean>}
   */
  async verifyOTP(email, code) {
    const key = `${REDIS_KEYS.PHONE_OTP}${email}`;
    const storedCode = await cacheGet(key);

    if (!storedCode || storedCode.toString() !== code.toString()) {
      return false;
    }

    await cacheDel(key);
    return true;
  }
}

module.exports = new OTPService();
