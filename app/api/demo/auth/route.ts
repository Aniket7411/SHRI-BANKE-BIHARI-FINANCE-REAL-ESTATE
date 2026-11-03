import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Demo mode only: auth calls from the browser shim (sets / clears the demo session cookie). */
export async function POST(req: Request) {
  if (isSupabaseConfigured) return NextResponse.json({ data: null, error: { message: "Not found" } }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; email?: string; password?: string; attrs?: Record<string, unknown> };
  const db = await supabaseServer();
  switch (body.action) {
    case "signIn":
      return NextResponse.json(await db.auth.signInWithPassword({ email: String(body.email ?? ""), password: String(body.password ?? "") }));
    case "signOut":
      return NextResponse.json(await db.auth.signOut());
    case "getUser":
      return NextResponse.json(await db.auth.getUser());
    case "getSession":
      return NextResponse.json(await db.auth.getSession());
    case "updateUser":
      return NextResponse.json(await db.auth.updateUser((body.attrs ?? {}) as { password?: string }));
    default:
      return NextResponse.json({ data: null, error: { message: "Unknown action" } }, { status: 400 });
  }
}
