import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { demoClient } from "@/lib/demo/db";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Cookie-less anon client for reading published content.
 * Safe to use inside `'use cache'` functions (no request data involved).
 * Demo database until Supabase is configured.
 */
export const supabasePublic = (): SupabaseClient =>
  isSupabaseConfigured
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    : demoClient({ kind: "anon" });
