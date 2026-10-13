import "server-only";
import { z } from "zod";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";
import { button, detailsTable, esc, layout, notifyRecipients, sendMail, siteUrl } from "@/lib/mail";
import { formatPrice } from "@/lib/format";
import { getSiteSettings } from "@/lib/api";
import { site, whatsappLink } from "@/lib/site";
import type { Lead } from "@/lib/types";

/** Last 10 digits of an Indian mobile — the key used to merge repeat enquiries. */
export const normalizePhone = (v: string) => v.replace(/\D/g, "").slice(-10);

const str = (max: number) => z.string().trim().max(max);

export const leadSchema = z.object({
  name: str(120).min(2),
  phone: str(20).refine((v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, "")), "Invalid mobile number"),
  email: z.union([z.email().max(200), z.literal("")]).optional(),
  interest: str(60).default("Other"),
  budget: str(60).optional(),
  message: str(2000).optional(),
  callbackSlot: str(120).optional(),
  source: str(80).default("website"),
  propertyId: str(120).optional(),
  utm: z.record(z.string(), str(300)).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

type Channel = "website" | "meta" | "whatsapp" | "manual" | "import";

/** Open leads with the same phone in this window get merged instead of duplicated. */
const DEDUPE_DAYS = 90;

export interface CreateLeadResult {
  id: string;
  ref: string;
  duplicate: boolean;
}

/**
 * Create (or merge) a lead and write its timeline entry.
 * Shared by the website form API and the Meta / WhatsApp webhooks.
 */
export async function createLead(
  input: LeadInput,
  opts: { channel?: Channel; meta?: Record<string, unknown> } = {},
): Promise<CreateLeadResult> {
  const db = supabaseAdmin();
  const phoneNorm = normalizePhone(input.phone);
  const since = new Date(Date.now() - DEDUPE_DAYS * 864e5).toISOString();

  const { data: existing } = await db
    .from("leads")
    .select("id, ref, submissions")
    .eq("phone_norm", phoneNorm)
    .not("status", "in", "(won,lost)")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await db
      .from("leads")
      .update({
        submissions: existing.submissions + 1,
        last_activity_at: new Date().toISOString(),
        ...(input.email ? { email: input.email } : {}),
      })
      .eq("id", existing.id);
    await db.from("lead_activities").insert({
      lead_id: existing.id,
      kind: "resubmitted",
      body: input.message || `New enquiry: ${input.interest}`,
      data: { ...input, channel: opts.channel ?? "website", meta: opts.meta },
    });
    return { id: existing.id, ref: `L-${existing.ref}`, duplicate: true };
  }

  const { data, error } = await db
    .from("leads")
    .insert({
      name: input.name,
      phone: input.phone,
      phone_norm: phoneNorm,
      email: input.email || null,
      interest: input.interest,
      budget: input.budget || null,
      message: input.message || null,
      callback_slot: input.callbackSlot || null,
      source: input.source,
      channel: opts.channel ?? "website",
      property_id: input.propertyId || null,
      utm: input.utm ?? {},
      meta: opts.meta ?? {},
    })
    .select("id, ref")
    .single();

  // Unknown property id (e.g. a deleted listing) — retry without the link rather than lose the lead.
  if (error?.code === "23503" && input.propertyId) {
    return createLead({ ...input, propertyId: undefined, message: [input.message, `(Property: ${input.propertyId})`].filter(Boolean).join(" ") }, opts);
  }
  if (error || !data) throw new Error(`Lead insert failed: ${error?.message}`);

  await db.from("lead_activities").insert({ lead_id: data.id, kind: "created", body: `Lead from ${input.source}` });
  return { id: data.id, ref: `L-${data.ref}`, duplicate: false };
}

/** Admin alert + customer auto-reply. Never throws. */
export async function sendLeadEmails(input: LeadInput, result: CreateLeadResult | null) {
  let propertyLine: string | undefined;
  let propertyTitle: string | undefined;
  if (input.propertyId && hasServiceRole()) {
    const { data } = await supabaseAdmin().from("properties").select("title, locality, price, purpose").eq("id", input.propertyId).maybeSingle();
    if (data) {
      propertyTitle = data.title;
      propertyLine = `${data.title}, ${data.locality} — ${formatPrice(Number(data.price))}${data.purpose === "Rent" ? "/mo" : ""}`;
    }
  }

  const s = await getSiteSettings();
  const ref = result?.ref ?? "—";
  const utm = input.utm ?? {};
  const tasks: Promise<unknown>[] = [];

  const recipients = notifyRecipients();
  if (recipients.length) {
    const subject = `${result?.duplicate ? "Repeat enquiry" : "New lead"}: ${input.name} · ${input.interest} (${ref})`;
    const body =
      detailsTable([
        ["Lead", ref + (result?.duplicate ? " (merged with existing lead)" : "")],
        ["Name", input.name],
        ["Phone", input.phone],
        ["Email", input.email],
        ["Interested in", input.interest],
        ["Budget", input.budget],
        ["Property", propertyLine ?? input.propertyId],
        ["Callback slot", input.callbackSlot],
        ["Message", input.message],
        ["Source", input.source],
        ["Campaign", [utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean).join(" / ")],
      ]) +
      button(`https://wa.me/91${normalizePhone(input.phone)}`, "WhatsApp the customer") +
      (result ? `<p style="margin:12px 0 0;font-size:13px"><a href="${esc(siteUrl())}/admin/leads/${esc(result.id)}" style="color:#b8893b">Open in CRM →</a></p>` : "");
    tasks.push(sendMail({ to: recipients, subject, html: layout("You have a new enquiry", body, s), replyTo: input.email || undefined }));
  }

  if (input.email) {
    const body =
      `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">Namaste ${esc(input.name.split(" ")[0])},</p>` +
      `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">Thank you for contacting ${esc(site.fullName)}. We've received your request${
        propertyTitle ? ` about <strong>${esc(propertyTitle)}</strong>` : ` for <strong>${esc(input.interest)}</strong>`
      } and an advisor will call you shortly${input.callbackSlot ? ` (${esc(input.callbackSlot)})` : ""}.</p>` +
      `<p style="font-size:15px;line-height:1.6;margin:0">Your reference number is <strong>${esc(ref)}</strong>.</p>` +
      button(whatsappLink(s, `Hi! My enquiry reference is ${ref}.`), "Chat with us on WhatsApp") +
      `<p style="font-size:13px;color:#7a746b;margin:16px 0 0">Or call us at ${esc(s.phone)} · ${esc(s.hours)}</p>`;
    tasks.push(sendMail({ to: input.email, subject: `We've received your enquiry — ${site.name}`, html: layout("Thank you! We'll be in touch soon.", body, s) }));
  }

  await Promise.allSettled(tasks);
}

/* ---------------------------------------------------------------- abuse guard */

const hits = new Map<string, number[]>();

/** Best-effort per-instance rate limit (serverless instances don't share memory). */
export function rateLimited(key: string, max = 5, windowMs = 10 * 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

export type { Lead };
