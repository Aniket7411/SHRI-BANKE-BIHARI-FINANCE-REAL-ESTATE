import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimited } from "@/lib/crm";
import { hasServiceRole, supabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({ email: z.email().max(200), source: z.string().max(40).optional() });

/** Footer newsletter sign-ups. */
export async function POST(req: Request) {
  if (rateLimited(`sub:${clientIp(req)}`)) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 422 });

  if (hasServiceRole()) {
    const { error } = await supabaseAdmin()
      .from("subscribers")
      .upsert({ email: parsed.data.email.toLowerCase(), source: parsed.data.source ?? "footer" }, { onConflict: "email", ignoreDuplicates: true });
    if (error) console.error("[subscribe]", error.message);
  }
  return NextResponse.json({ ok: true });
}
