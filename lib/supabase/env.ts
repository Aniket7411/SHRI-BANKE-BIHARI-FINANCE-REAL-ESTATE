/**
 * Supabase connection settings. Until these are set in `.env.local` the app runs
 * in demo mode: every client in lib/supabase/* talks to the local demo database
 * (lib/demo/db.ts) and demo logins are shown on /admin/login.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Accepts both the legacy "anon" name and Supabase's newer "publishable" key name.
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** No Supabase keys → demo database + demo logins. */
export const isDemoBackend = !isSupabaseConfigured;
