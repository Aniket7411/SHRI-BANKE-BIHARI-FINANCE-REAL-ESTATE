import { NextResponse, connection } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Keep-alive / uptime check. A tiny read on site_settings counts as activity, so a
 * free Supabase project doesn't pause after a week without visitors. Pinged by
 * .github/workflows/keepalive.yml (and vercel.json cron). Harmless to call publicly.
 */
export async function GET() {
  await connection(); // always run at request time — never prerendered
  const started = Date.now();
  const { error } = await supabasePublic().from("site_settings").select("id").eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ ok: true, backend: isSupabaseConfigured ? "supabase" : "demo", ms: Date.now() - started }, { headers: { "cache-control": "no-store" } });
}
