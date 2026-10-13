import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Cookie-less anon client for reading published content.
 * Safe to use inside `'use cache'` functions (no request data involved).
 */
export const supabasePublic = () =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
