import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { demoClient } from "@/lib/demo/db";
import { SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Service-role client: bypasses RLS. Server-only — used by route handlers that
 * accept public submissions (leads, job applications) and by webhooks.
 * Demo database until Supabase is configured.
 */
/** Secret key: Supabase's newer "secret" name or the legacy "service_role" one. */
const serviceKey = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured) return demoClient({ kind: "service" });
  const key = serviceKey();
  if (!SUPABASE_URL || !key) throw new Error("Supabase service role is not configured");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** True when supabaseAdmin() can be used (always in demo mode). */
export const hasServiceRole = () => !isSupabaseConfigured || Boolean(SUPABASE_URL && serviceKey());
