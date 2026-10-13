import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Landing point for Supabase email links (password reset): swaps the code for a session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";
  const target = next.startsWith("/admin") ? next : "/admin";

  if (code) {
    const db = await supabaseServer();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, url.origin));
  }
  return NextResponse.redirect(new URL("/admin/login?error=That+link+has+expired.+Please+request+a+new+one.", url.origin));
}
