import { after, NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/crm";
import { requirementSchema, saveRequirement, sendRequirementEmails, type SaveRequirementResult } from "@/lib/requirements-server";
import { hasServiceRole } from "@/lib/supabase/admin";

/** Public "tell us what you need" form → requirement + CRM lead + emails. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });

  // Honeypot: real users never see or fill this field.
  if ((body as Record<string, unknown>).website) return NextResponse.json({ ok: true, ref: "R-0", alerts: true, updated: false });

  if (rateLimited(`requirement:${clientIp(req)}`)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please call or WhatsApp us instead." }, { status: 429 });
  }

  const parsed = requirementSchema.safeParse(body);
  if (!parsed.success) {
    const issues: Record<string, string> = {};
    for (const i of parsed.error.issues) issues[String(i.path[0] ?? "form")] ??= i.message;
    return NextResponse.json({ ok: false, error: "Please check the highlighted fields", issues }, { status: 422 });
  }
  const input = parsed.data;

  if (!hasServiceRole()) {
    console.info("[requirements] Supabase not configured — requirement:", input);
    return NextResponse.json({ ok: false, error: "We couldn't save your requirement right now. Please call or WhatsApp us." }, { status: 503 });
  }

  let saved: SaveRequirementResult;
  try {
    saved = await saveRequirement(input);
  } catch (err) {
    console.error("[requirements]", err);
    // Still email the team so the enquiry isn't lost.
    after(() => sendRequirementEmails(input, null));
    return NextResponse.json({ ok: false, error: "We couldn't save your requirement right now. Please try again, or call / WhatsApp us." }, { status: 500 });
  }

  after(() => sendRequirementEmails(input, saved));
  return NextResponse.json({ ok: true, ref: saved.ref, alerts: input.alerts, updated: saved.updated });
}
