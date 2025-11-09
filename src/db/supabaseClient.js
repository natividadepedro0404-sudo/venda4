const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase variables not set. Some features will fail until configured.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;