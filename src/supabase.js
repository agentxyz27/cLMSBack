/**
 * supabase.js
 *
 * Supabase client for the backend.
 * Used for file uploads to Supabase Storage.
 * Database access still goes through Prisma — not this client.
 *
 * Requires two env variables:
 *   SUPABASE_URL     → your project URL e.g. https://xyz.supabase.co
 *   SUPABASE_SERVICE_KEY → service role key (not anon key — needs write access)
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports = supabase