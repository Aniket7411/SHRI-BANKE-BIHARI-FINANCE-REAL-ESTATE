"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { bool, fail, fieldErrors, ok, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";
import { fromIstInput } from "./time";

const schema = z
  .object({
    title: z.string().min(3, "Add a title").max(120),
    description: z.string().max(600, "Keep it under 600 characters"),
    code: z
      .string()
      .max(24, "Keep the code short")
      .regex(/^[A-Z0-9_-]*$/, "Letters, numbers, - and _ only")
      .transform((v) => v || null),
    discount_text: z.string().min(2, "e.g. Zero processing fee").max(60),
    applies_to: z.string().max(60).transform((v) => v || "All"),
    starts_at: z.string().nullable(),
    ends_at: z.string().nullable(),
    show_banner: z.boolean(),
    show_popup: z.boolean(),
    cta_label: z.string().max(30).transform((v) => v || "Claim offer"),
    cta_href: z
      .string()
      .max(300)
      .refine((v) => !v || v.startsWith("/") || v.startsWith("#") || /^https?:\/\//.test(v) || v.startsWith("tel:") || v.startsWith("https://wa.me"), "Use a page like /loans#apply or a full https:// link")
      .transform((v) => v || "/contact"),
    theme: z.enum(["diwali", "gold", "default"]),
    active: z.boolean(),
  })
  .refine((v) => !v.starts_at || !v.ends_at || Date.parse(v.ends_at) > Date.parse(v.starts_at), { path: ["ends_at"], message: "End must be after the start" });

function read(fd: FormData) {
  const start = text(fd, "starts_at");
  const end = text(fd, "ends_at");
  return schema.safeParse({
    title: text(fd, "title"),
    description: text(fd, "description"),
    code: text(fd, "code").toUpperCase().replace(/\s+/g, ""),
    discount_text: text(fd, "discount_text"),
    applies_to: text(fd, "applies_to"),
    starts_at: start ? fromIstInput(start) : null,
    ends_at: end ? fromIstInput(end) : null,
    show_banner: bool(fd, "show_banner"),
    show_popup: bool(fd, "show_popup"),
    cta_label: text(fd, "cta_label"),
    cta_href: text(fd, "cta_href"),
    theme: text(fd, "theme") || "default",
    active: bool(fd, "active"),
  });
}

const refresh = () => updateTag(TAGS.offers);

export async function saveOffer(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = read(fd);
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const id = text(fd, "id");
  if (id) {
    const { error } = await db.from("offers").update(parsed.data).eq("id", id);
    if (error) return fail(`Couldn't save the offer: ${error.message}`);
  } else {
    const { data: first } = await db.from("offers").select("sort_order").order("sort_order").limit(1).maybeSingle();
    const { error } = await db.from("offers").insert({ ...parsed.data, sort_order: (first?.sort_order ?? 0) - 1 });
    if (error) return fail(`Couldn't create the offer: ${error.message}`);
  }
  refresh();
  return ok(id ? "Offer saved" : "Offer created");
}

export async function duplicateOffer(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { data: src, error: readError } = await db.from("offers").select("*").eq("id", text(fd, "id")).maybeSingle();
  if (readError || !src) return fail("Offer not found");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at, updated_at, ...rest } = src;
  const { error } = await db.from("offers").insert({ ...rest, title: `${src.title} (copy)`, active: false, sort_order: (src.sort_order ?? 0) + 1 });
  if (error) return fail(`Couldn't duplicate: ${error.message}`);
  refresh();
  return ok("Duplicated — the copy is hidden until you switch it on");
}

export async function toggleOffer(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const active = text(fd, "active") === "true";
  const { error } = await db.from("offers").update({ active }).eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't update: ${error.message}`);
  refresh();
  return ok(active ? "Offer switched on" : "Offer hidden from the website");
}

export async function deleteOffer(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { error } = await db.from("offers").delete().eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't delete: ${error.message}`);
  refresh();
  return ok("Offer deleted");
}

export async function moveOffer(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { data: rows, error } = await db.from("offers").select("id").order("sort_order").order("created_at", { ascending: false });
  if (error) return fail(error.message);
  const ids = (rows ?? []).map((r) => String(r.id));
  const i = ids.indexOf(text(fd, "id"));
  const j = i + (text(fd, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= ids.length) return ok();
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const results = await Promise.all(ids.map((id, n) => db.from("offers").update({ sort_order: n }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(`Couldn't reorder: ${failed.error.message}`);
  refresh();
  return ok("Order updated");
}
