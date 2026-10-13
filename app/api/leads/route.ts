import { after, NextResponse } from "next/server";
import { clientIp, createLead, leadSchema, rateLimited, sendLeadEmails, type CreateLeadResult } from "@/lib/crm";
import { hasServiceRole } from "@/lib/supabase/admin";

/** Public endpoint for every website lead form. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });

  // Honeypot: real users never see or fill this field.
  if ((body as Record<string, unknown>).website) return NextResponse.json({ ok: true, id: "L-0" });

  if (rateLimited(`lead:${clientIp(req)}`)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please call or WhatsApp us instead." }, { status: 429 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please check your details", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const input = parsed.data;

  let result: CreateLeadResult | null = null;
  if (hasServiceRole()) {
    try {
      result = await createLead(input);
    } catch (err) {
      console.error("[leads]", err);
      // Still email the lead below so nothing is lost if the database is down.
    }
  } else {
    console.info("[leads] Supabase not configured — lead:", input);
  }

  after(() => sendLeadEmails(input, result));

  return NextResponse.json({ ok: true, id: result?.ref ?? `L-${Date.now().toString(36).toUpperCase()}` });
}
