"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { bool, fail, fieldErrors, ok, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";
import { videoInfo } from "@/lib/video";

const schema = z.object({
  title: z.string().min(2, "Add a short title, e.g. 3 BHK villa tour, Swaroop Nagar").max(120),
  url: z.string().refine((v) => videoInfo(v) !== null, "Paste an Instagram reel or YouTube Shorts link"),
  cover: z.string().refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), "Paste a full image link starting with https://"),
  property_id: z.string().min(1).nullable(),
  active: z.boolean(),
});

const parse = (fd: FormData) =>
  schema.safeParse({
    title: text(fd, "title"),
    url: text(fd, "url"),
    cover: text(fd, "cover"),
    property_id: text(fd, "property_id") || null,
    active: fd.has("active") ? bool(fd, "active") : true,
  });

const refresh = () => updateTag(TAGS.reels);

export async function createReel(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = parse(fd);
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  // New reels go to the front, so the latest one is what visitors see first.
  const { data: first } = await db.from("reels").select("sort_order").order("sort_order").limit(1).maybeSingle();
  const { error } = await db.from("reels").insert({ ...parsed.data, sort_order: (first?.sort_order ?? 1) - 1 });
  if (error) return fail(`Couldn't add the reel: ${error.message}`);
  refresh();
  return ok("Reel added — it's live on the website");
}

export async function updateReel(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = parse(fd);
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const { title, url, cover, property_id } = parsed.data; // visibility has its own Show / Hide button
  const { error } = await db.from("reels").update({ title, url, cover, property_id }).eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't save: ${error.message}`);
  refresh();
  return ok("Reel saved");
}

export async function toggleReel(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const active = text(fd, "active") === "true";
  const { error } = await db.from("reels").update({ active }).eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't update: ${error.message}`);
  refresh();
  return ok(active ? "Now visible on the website" : "Hidden from the website");
}

export async function deleteReel(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { error } = await db.from("reels").delete().eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't delete: ${error.message}`);
  refresh();
  return ok("Reel deleted");
}

export async function moveReel(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { data: rows, error } = await db.from("reels").select("id").order("sort_order").order("created_at");
  if (error) return fail(error.message);
  const ids = (rows ?? []).map((r) => String(r.id));
  const i = ids.indexOf(text(fd, "id"));
  const j = i + (text(fd, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= ids.length) return ok();
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const results = await Promise.all(ids.map((id, n) => db.from("reels").update({ sort_order: n }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(`Couldn't reorder: ${failed.error.message}`);
  refresh();
  return ok("Order updated");
}
