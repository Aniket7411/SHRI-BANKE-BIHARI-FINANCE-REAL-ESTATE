import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getSiteSettings } from "@/lib/api";
import { createLead, normalizePhone } from "@/lib/crm";
import { formatPrice } from "@/lib/format";
import { button, detailsTable, esc, layout, notifyRecipients, sendMail, siteUrl } from "@/lib/mail";
import { ALL_TYPES } from "@/lib/property-meta";
import { budgetLabel, requirementRef, requirementSummary, type RequirementRow } from "@/lib/requirements";
import { site, whatsappLink } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";

const str = (max: number) => z.string().trim().max(max);
const money = z.number().nonnegative().max(1e11).nullable().optional();

export const requirementSchema = z
  .object({
    name: str(120).min(2, "Please enter your name"),
    phone: str(20).refine((v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, "")), "Enter a valid 10-digit mobile number"),
    email: z.union([z.email("Enter a valid email").max(200), z.literal("")]).optional(),
    purpose: z.enum(["Buy", "Rent"]),
    city: str(60).default(""),
    localities: z.array(str(80)).max(12).default([]),
    category: z.enum(["", "Residential", "Commercial", "Semi-commercial"]).default(""),
    types: z.array(z.string().refine((t) => ALL_TYPES.includes(t), "Unknown property type")).max(12).default([]),
    budgetMin: money,
    budgetMax: money,
    beds: z.array(z.number().int().min(1).max(5)).max(5).default([]),
    notes: str(1000).default(""),
    alerts: z.boolean().default(true),
    source: str(80).default("Requirement form"),
    utm: z.record(z.string(), str(300)).optional(),
  })
  .refine((v) => v.budgetMin == null || v.budgetMax == null || v.budgetMax >= v.budgetMin, { path: ["budgetMax"], message: "Max budget is below the minimum" });

export type RequirementInput = z.infer<typeof requirementSchema>;

export const newRequirementToken = () => randomBytes(18).toString("base64url");
export const stopAlertsUrl = (token: string) => `${siteUrl()}/alerts/${token}`;

const sameList = <T>(a: T[], b: T[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

export interface SaveRequirementResult {
  id: string;
  ref: string;
  updated: boolean;
  row: RequirementRow;
}

/**
 * Save a requirement and file it as a CRM lead. Submitting the exact same
 * search again refreshes the existing requirement instead of duplicating it.
 */
export async function saveRequirement(input: RequirementInput): Promise<SaveRequirementResult> {
  const db = supabaseAdmin();
  const phoneNorm = normalizePhone(input.phone);
  const criteria = {
    purpose: input.purpose,
    city: input.city,
    localities: input.localities,
    category: input.category,
    types: input.types,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    beds: input.beds,
  };

  const lead = await createLead({
    name: input.name,
    phone: input.phone,
    email: input.email,
    interest: input.purpose === "Rent" ? "Rent" : "Buy Property",
    budget: budgetLabel(criteria) || undefined,
    message: [`Requirement: ${requirementSummary(criteria)}`, input.notes].filter(Boolean).join("\n"),
    source: input.source,
    utm: input.utm,
  });

  const { data: open } = await db.from("requirements").select("*").eq("phone_norm", phoneNorm).neq("status", "closed").order("created_at", { ascending: false }).limit(20);
  const same = ((open ?? []) as RequirementRow[]).find(
    (r) =>
      r.purpose === criteria.purpose &&
      r.city === criteria.city &&
      r.category === criteria.category &&
      Number(r.budget_min ?? -1) === Number(criteria.budget_min ?? -1) &&
      Number(r.budget_max ?? -1) === Number(criteria.budget_max ?? -1) &&
      sameList(r.localities, criteria.localities) &&
      sameList(r.types, criteria.types) &&
      sameList(r.beds, criteria.beds),
  );

  if (same) {
    const { data, error } = await db
      .from("requirements")
      .update({
        name: input.name,
        email: input.email || same.email,
        notes: input.notes || same.notes,
        alerts: input.alerts,
        status: "active",
        lead_id: same.lead_id ?? lead.id,
      })
      .eq("id", same.id)
      .select("*")
      .single();
    if (error || !data) throw new Error(`Requirement update failed: ${error?.message}`);
    return { id: same.id, ref: requirementRef(same.ref), updated: true, row: data as RequirementRow };
  }

  const { data, error } = await db
    .from("requirements")
    .insert({
      ...criteria,
      lead_id: lead.id,
      name: input.name,
      phone: input.phone,
      phone_norm: phoneNorm,
      email: input.email || null,
      notes: input.notes,
      alerts: input.alerts,
      source: input.source,
      token: newRequirementToken(),
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`Requirement insert failed: ${error?.message}`);
  await db.from("lead_activities").insert({ lead_id: lead.id, kind: "note", body: `Saved requirement ${requirementRef(data.ref)}: ${requirementSummary(criteria)}` });
  return { id: data.id, ref: requirementRef(data.ref), updated: false, row: data as RequirementRow };
}

/* ---------------------------------------------------------------- emails */

/** Team alert + customer confirmation. Never throws. */
export async function sendRequirementEmails(input: RequirementInput, saved: SaveRequirementResult | null) {
  try {
    const s = await getSiteSettings();
    const criteria = {
      purpose: input.purpose,
      city: input.city,
      localities: input.localities,
      category: input.category,
      types: input.types,
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      beds: input.beds,
    };
    const ref = saved?.ref ?? "—";
    const tasks: Promise<unknown>[] = [];

    const recipients = notifyRecipients();
    if (recipients.length) {
      const body =
        detailsTable([
          ["Requirement", ref + (saved?.updated ? " (updated an existing one)" : "")],
          ["Name", input.name],
          ["Phone", input.phone],
          ["Email", input.email],
          ["Looking for", requirementSummary(criteria)],
          ["Notes", input.notes],
          ["Alerts", input.alerts ? "Yes — wants new matching listings" : "No"],
          ["Source", input.source],
        ]) +
        button(`https://wa.me/91${normalizePhone(input.phone)}`, "WhatsApp the customer") +
        (saved ? `<p style="margin:12px 0 0;font-size:13px"><a href="${esc(siteUrl())}/admin/requirements/${esc(saved.id)}" style="color:#b8893b">Open requirement →</a></p>` : "");
      tasks.push(sendMail({ to: recipients, subject: `New requirement: ${input.name} · ${input.purpose} ${input.types[0] || input.category || "property"} (${ref})`, html: layout("Someone told us what they need", body, s), replyTo: input.email || undefined }));
    }

    if (input.email && saved) {
      const body =
        `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">Namaste ${esc(input.name.split(" ")[0])},</p>` +
        `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Thank you for telling us what you're looking for. Our advisor will call you with options${
          input.alerts ? ", and we'll email you as soon as a matching property is listed" : ""
        }.</p>` +
        detailsTable([
          ["Reference", ref],
          ["Looking for", requirementSummary(criteria)],
          ["Notes", input.notes],
        ]) +
        button(whatsappLink(s, `Hi! My requirement reference is ${ref}.`), "Chat with us on WhatsApp") +
        stopFooter(saved.row.token, input.alerts);
      tasks.push(sendMail({ to: input.email, subject: `We've saved your requirement (${ref}) — ${site.name}`, html: layout("Your requirement is saved", body, s) }));
    }
    await Promise.allSettled(tasks);
  } catch (err) {
    console.error("[requirements] emails failed:", err);
  }
}

function stopFooter(token: string, alerts: boolean) {
  return `<p style="font-size:12px;color:#7a746b;margin:20px 0 0;line-height:1.5">${
    alerts ? "You're getting this because you asked for property alerts." : "You can turn on new-listing alerts any time."
  } <a href="${esc(stopAlertsUrl(token))}" style="color:#7a746b">${alerts ? "Stop alerts" : "Manage alerts"}</a></p>`;
}

export interface AlertProperty {
  id: string;
  title: string;
  locality: string;
  city: string;
  price: number | string;
  purpose: string;
  type: string;
  beds: number | null;
  area: number;
  images: string[];
}

export const propertyUrl = (id: string) => `${siteUrl()}/properties/${id}`;

export function alertWhatsAppText(r: Pick<RequirementRow, "name">, p: AlertProperty) {
  const price = `${formatPrice(Number(p.price))}${p.purpose === "Rent" ? "/mo" : ""}`;
  return `Namaste ${r.name.split(" ")[0]}! A new property matching your requirement is now listed:\n\n*${p.title}*\n${p.locality}${p.city ? `, ${p.city}` : ""} · ${price}\n\n${propertyUrl(p.id)}\n\nWould you like to schedule a site visit?`;
}

/** "A property matching your requirement is listed" email. */
export async function sendPropertyAlertEmail(r: RequirementRow, p: AlertProperty) {
  if (!r.email) return false;
  const s = await getSiteSettings();
  const price = `${formatPrice(Number(p.price))}${p.purpose === "Rent" ? "/mo" : ""}`;
  const img = p.images[0]
    ? `<a href="${esc(propertyUrl(p.id))}"><img src="${esc(p.images[0])}" alt="" width="504" style="display:block;width:100%;max-width:504px;height:auto;border-radius:12px;margin:0 0 16px" /></a>`
    : "";
  const body =
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Namaste ${esc(r.name.split(" ")[0])}, a new listing matches what you told us you're looking for.</p>` +
    img +
    `<p style="font-size:17px;font-weight:bold;margin:0 0 4px">${esc(p.title)}</p>` +
    `<p style="font-size:14px;color:#7a746b;margin:0 0 12px">${esc(p.locality)}${p.city ? `, ${esc(p.city)}` : ""}</p>` +
    detailsTable([
      ["Price", price],
      ["Type", p.type],
      ["Bedrooms", p.beds ? `${p.beds} BHK` : ""],
      ["Area", p.area ? `${p.area.toLocaleString("en-IN")} sq.ft` : ""],
      ["Your requirement", `${requirementRef(r.ref)} · ${requirementSummary(r)}`],
    ]) +
    button(propertyUrl(p.id), "View property & photos") +
    `<p style="margin:12px 0 0;font-size:13px"><a href="${esc(whatsappLink(s, `Hi! I'd like to visit "${p.title}" (${requirementRef(r.ref)}).`))}" style="color:#b8893b">Book a free site visit on WhatsApp →</a></p>` +
    stopFooter(r.token, true);
  return sendMail({ to: r.email, subject: `New match: ${p.title}, ${p.locality} — ${price}`, html: layout("A property you may like", body, s) });
}
