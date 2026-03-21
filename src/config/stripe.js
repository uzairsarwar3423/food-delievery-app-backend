// src/config/stripe.js
// Stripe SDK configuration

const Stripe = require('stripe');
const logger = require('../utils/logger');

if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn('STRIPE_SECRET_KEY missing — Stripe not initialized');
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-04-10',
  telemetry: false,
});

module.exports = stripe;
