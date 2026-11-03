"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { bool, fail, fieldErrors, ok, optNumber, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";
import { videoInfo } from "@/lib/video";

const TABLES = { testimonials: TAGS.testimonials, faqs: TAGS.faqs } as const;
type Table = keyof typeof TABLES;
const table = (fd: FormData) => {
  const t = text(fd, "table");
  if (!(t in TABLES)) throw new Error("Unknown table");
  return t as Table;
};

const testimonialSchema = z.object({
  name: z.string().min(2, "Add a name"),
  role: z.string().max(120),
  quote: z.string().min(10, "Add the review text").max(1000),
  avatar: z.string(),
  rating: z.number().int().min(1).max(5),
  reel_url: z.string().refine((v) => !v || videoInfo(v) !== null, "Paste an Instagram reel or YouTube link"),
  active: z.boolean(),
});

const faqSchema = z.object({
  q: z.string().min(5, "Add the question"),
  a: z.string().min(5, "Add the answer").max(3000),
  active: z.boolean(),
});

export async function saveContent(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const t = table(fd);
  const parsed =
    t === "testimonials"
      ? testimonialSchema.safeParse({
          name: text(fd, "name"),
          role: text(fd, "role"),
          quote: text(fd, "quote"),
          avatar: text(fd, "avatar"),
          rating: optNumber(fd, "rating") ?? 5,
          reel_url: text(fd, "reel_url"),
          active: bool(fd, "active"),
        })
      : faqSchema.safeParse({ q: text(fd, "q"), a: text(fd, "a"), active: bool(fd, "active") });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));

  const id = text(fd, "id");
  if (id) {
    const { error } = await db.from(t).update(parsed.data).eq("id", id);
    if (error) return fail(error.message);
  } else {
    const { data: last } = await db.from(t).select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await db.from(t).insert({ ...parsed.data, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) return fail(error.message);
  }
  updateTag(TABLES[t]);
  return ok(id ? "Saved" : "Added");
}

export async function deleteContent(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const t = table(fd);
  const { error } = await db.from(t).delete().eq("id", text(fd, "id"));
  if (error) return fail(error.message);
  updateTag(TABLES[t]);
  return ok("Deleted");
}

export async function moveContent(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const t = table(fd);
  const { data: rows } = await db.from(t).select("id").order("sort_order").order("id");
  const ids = (rows ?? []).map((r) => String(r.id));
  const i = ids.indexOf(text(fd, "id"));
  const j = i + (text(fd, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= ids.length) return ok();
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((id, n) => db.from(t).update({ sort_order: n }).eq("id", id)));
  updateTag(TABLES[t]);
  return ok();
}

/** Publish a customer review (only if they agreed to show it). */
export async function approveReview(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = text(fd, "id");
  const { data: row } = await db.from("testimonials").select("consent").eq("id", id).maybeSingle();
  if (!row) return fail("Review not found");
  if (row.consent === false) return fail("The customer asked to keep this review private.");
  const { error } = await db.from("testimonials").update({ active: true }).eq("id", id);
  if (error) return fail(error.message);
  updateTag(TAGS.testimonials);
  return ok("Published on the website");
}
