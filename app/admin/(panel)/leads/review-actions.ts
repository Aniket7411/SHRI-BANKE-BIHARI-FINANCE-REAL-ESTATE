"use server";

import { refresh } from "next/cache";
import { getSiteSettings } from "@/lib/api";
import { requireStaff } from "@/lib/admin/auth";
import { fail, ok, text, type ActionResult } from "@/lib/admin/form";
import { button as mailButton, isMailConfigured, layout, sendMail } from "@/lib/mail";
import { REVIEW_LINK_DAYS, isOpen, newReviewToken, reviewUrl, roleHint, type ReviewRequest } from "@/lib/reviews";

export type ReviewLinkResult = ActionResult & { url?: string };

type Db = Awaited<ReturnType<typeof requireStaff>>["db"];

/** The lead, if this staff member may act on it (agents: only their own). */
async function loadLead(db: Db, staff: { id: string; role: string }, id: string) {
  if (!id) return null;
  let q = db.from("leads").select("id, ref, name, phone, email, interest, status, property_id, assigned_to").eq("id", id);
  if (staff.role !== "admin") q = q.eq("assigned_to", staff.id);
  const { data } = await q.maybeSingle();
  return data as { id: string; ref: number; name: string; phone: string; email: string | null; interest: string; status: string; property_id: string | null } | null;
}

/** Reuse the open link for this lead, or create one. Only for leads marked Won. */
async function linkFor(db: Db, staffId: string, lead: NonNullable<Awaited<ReturnType<typeof loadLead>>>) {
  const { data: existing } = await db.from("review_requests").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const prev = existing as ReviewRequest | null;
  if (prev && isOpen(prev)) return { req: prev, created: false };
  if (prev?.submitted_at) return { req: prev, created: false };

  const { data: property } = lead.property_id
    ? await db.from("properties").select("purpose, type, locality, city").eq("id", lead.property_id).maybeSingle()
    : { data: null };
  const row = {
    token: newReviewToken(),
    lead_id: lead.id,
    property_id: lead.property_id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    role_hint: roleHint(property, lead.interest),
    created_by: staffId,
    expires_at: new Date(Date.now() + REVIEW_LINK_DAYS * 86_400_000).toISOString(),
  };
  const { data, error } = await db.from("review_requests").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  await db.from("lead_activities").insert({ lead_id: lead.id, actor: staffId, kind: "review_requested", body: null, data: {} });
  return { req: data as ReviewRequest, created: true };
}

export async function createReviewLink(fd: FormData): Promise<ReviewLinkResult> {
  const { staff, db } = await requireStaff();
  const lead = await loadLead(db, staff, text(fd, "id"));
  if (!lead) return fail("Lead not found, or it isn't assigned to you.");
  if (lead.status !== "won") return fail("Mark the deal as Won first, then ask for a review.");
  try {
    const { req, created } = await linkFor(db, staff.id, lead);
    if (req.submitted_at) return fail("This customer has already left a review.");
    if (created) refresh();
    return { ok: true, message: created ? "Review link ready — send it on WhatsApp" : undefined, url: reviewUrl(req.token) };
  } catch (err) {
    return fail(`Couldn't create the link: ${(err as Error).message}. Has migration 0007_reviews.sql been run?`);
  }
}

export async function emailReviewLink(fd: FormData): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  const lead = await loadLead(db, staff, text(fd, "id"));
  if (!lead) return fail("Lead not found, or it isn't assigned to you.");
  if (!lead.email) return fail("No email on this lead — send the link on WhatsApp instead.");
  if (!isMailConfigured()) return fail("Email isn't set up yet (SMTP). Send the link on WhatsApp instead.");
  try {
    const { req } = await linkFor(db, staff.id, lead);
    if (req.submitted_at) return fail("This customer has already left a review.");
    const body =
      `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Namaste ${lead.name.split(" ")[0]} ji,</p>` +
      `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Congratulations, and thank you for trusting us with your deal. Could you spare one minute to rate your experience? Your words help other families choose with confidence.</p>` +
      mailButton(reviewUrl(req.token), "Rate your experience") +
      `<p style="margin:16px 0 0;font-size:13px;color:#6b7280">— ${staff.fullName}, Shri Banke Bihari Finance &amp; Real Estate</p>`;
    const sent = await sendMail({ to: lead.email, subject: "How was your experience with us?", html: layout("How did we do?", body, await getSiteSettings()) });
    if (!sent) return fail("The email couldn't be sent. Try WhatsApp instead.");
    await db.from("lead_activities").insert({ lead_id: lead.id, actor: staff.id, kind: "email", body: `Review request emailed to ${lead.email}`, data: { to: lead.email, template: "review" } });
    refresh();
    return ok(`Review request emailed to ${lead.email}`);
  } catch (err) {
    return fail(`Couldn't send: ${(err as Error).message}`);
  }
}
