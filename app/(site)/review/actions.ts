"use server";

import { z } from "zod";
import { getSiteSettings } from "@/lib/api";
import { bool, fieldErrors, optNumber, text } from "@/lib/admin/form";
import { button as mailButton, detailsTable, layout, notifyRecipients, sendMail, siteUrl } from "@/lib/mail";
import { isOpen, type ReviewRequest } from "@/lib/reviews";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ReviewSubmitResult = { ok: true; rating: number } | { ok: false; message: string; errors?: Record<string, string> };

const schema = z.object({
  rating: z.number({ error: "Tap a star to rate us" }).int().min(1, "Tap a star to rate us").max(5),
  quote: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(1000, "Please keep it under 1000 characters"),
  name: z.string().trim().min(2, "Add your name").max(80),
  role: z.string().trim().max(120),
  consent: z.boolean(),
});

/**
 * Public review form (no login): the token proves the link came from us. Saves the review
 * hidden ("pending") for an admin to approve, marks the link used and tells the team.
 */
export async function submitReview(fd: FormData): Promise<ReviewSubmitResult> {
  const db = supabaseAdmin();
  const token = text(fd, "token");
  if (!/^[\w-]{16,64}$/.test(token)) return { ok: false, message: "This review link isn't valid." };
  const { data } = await db.from("review_requests").select("*").eq("token", token).maybeSingle();
  const req = data as ReviewRequest | null;
  if (!req) return { ok: false, message: "This review link isn't valid." };
  if (!isOpen(req)) return { ok: false, message: req.submitted_at ? "You've already shared your review — thank you!" : "This review link has expired. Please ask us for a new one." };

  const parsed = schema.safeParse({
    rating: optNumber(fd, "rating") ?? undefined,
    quote: text(fd, "quote"),
    name: text(fd, "name"),
    role: text(fd, "role"),
    consent: bool(fd, "consent"),
  });
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields", errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const { data: last } = await db.from("testimonials").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data: t, error } = await db
    .from("testimonials")
    .insert({
      name: v.name,
      role: v.role,
      quote: v.quote,
      rating: v.rating,
      active: false, // pending until an admin approves it
      source: "customer",
      verified_buyer: true,
      consent: v.consent,
      lead_id: req.lead_id,
      property_id: req.property_id,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error || !t) {
    console.error("[reviews] insert failed:", error?.message);
    return { ok: false, message: "Something went wrong saving your review. Please try again." };
  }

  // Mark the link used only if it still is open (guards against a double submit).
  await db.from("review_requests").update({ submitted_at: new Date().toISOString(), testimonial_id: t.id }).eq("id", req.id).is("submitted_at", null);
  if (req.lead_id) await db.from("lead_activities").insert({ lead_id: req.lead_id, actor: null, kind: "review", body: v.quote, data: { rating: v.rating } });

  const to = notifyRecipients();
  if (to.length) {
    const html = layout(
      `New ${v.rating}★ review from ${v.name}`,
      detailsTable([
        ["Rating", "★".repeat(v.rating)],
        ["Name", v.name],
        ["About", v.role],
        ["Review", v.quote],
        ["OK to publish", v.consent ? "Yes" : "No — private feedback"],
      ]) + mailButton(`${siteUrl()}/admin/content?tab=testimonials`, "Review & publish"),
      await getSiteSettings(),
    );
    await sendMail({ to, subject: `New ${v.rating}★ customer review — ${v.name}`, html }).catch(() => false);
  }

  return { ok: true, rating: v.rating };
}
