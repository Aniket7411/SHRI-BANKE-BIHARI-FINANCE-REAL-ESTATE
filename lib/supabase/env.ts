/**
 * Supabase connection settings. Until these are set in `.env.local`, the public
 * site falls back to the static demo data in `lib/data/*` and leads are logged
 * to the server console.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
