import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { runRemoteQuery, type RemoteCall } from "@/lib/demo/db";
import { DEMO_COOKIE } from "@/lib/demo/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Demo mode only: runs a table query recorded by the browser shim, as the signed-in demo user. */
export async function POST(req: Request) {
  if (isSupabaseConfigured) return NextResponse.json({ data: null, error: { message: "Not found" } }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { table?: string; calls?: RemoteCall[] } | null;
  if (!body?.table || !Array.isArray(body.calls)) return NextResponse.json({ data: null, error: { message: "Bad request" } }, { status: 400 });
  const uid = (await cookies()).get(DEMO_COOKIE)?.value ?? null;
  const res = await runRemoteQuery({ kind: "user", uid }, body.table, body.calls);
  return NextResponse.json(res);
}
