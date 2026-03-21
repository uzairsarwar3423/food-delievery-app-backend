// src/config/supabase.js
// Supabase client (used for storage, auth helpers, etc.)

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  logger.warn('Supabase env variables missing — Supabase client not initialized');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  {
    auth: { persistSession: false },
  },
);

module.exports = supabase;
