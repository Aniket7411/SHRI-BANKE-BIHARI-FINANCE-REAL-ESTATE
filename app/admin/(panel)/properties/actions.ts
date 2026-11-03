"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { bool, fail, fieldErrors, jsonList, mediaPath, ok, optNumber, slugify, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";
import { ensureCity } from "@/lib/admin/cities";
import { cleanCity } from "@/lib/cities";
import { ALL_TYPES, AREA_UNITS, DETAIL_SECTIONS, applies, categoryOf, isPlot, type Ctx } from "@/lib/property-meta";
import type { PropertyCategory, PropertyDetails, Purpose } from "@/lib/types";

const schema = z.object({
  title: z.string().min(3, "Add a title"),
  category: z.enum(["Residential", "Commercial", "Semi-commercial"]),
  type: z.string().refine((t) => ALL_TYPES.includes(t), "Pick a property type"),
  purpose: z.enum(["Buy", "Rent"]),
  city: z.string().min(2, "Pick a city, or add a new one").max(60),
  locality: z.string().min(2, "Add the locality"),
  price: z.number({ error: "Enter the price" }).positive("Enter the price"),
  area: z.number({ error: "Enter the area" }).int().positive("Enter the area"),
  beds: z.number().int().min(0).max(50).nullable(),
  baths: z.number().int().min(0).max(50).nullable(),
  description: z.string().max(5000),
  images: z.array(z.string().url()).max(6, "Up to 6 photos per property. Remove some and save again."),
  videos: z.array(z.string().url()).max(5, "Up to 5 videos per property"),
  tags: z.array(z.string()).max(12),
  amenities: z.array(z.string()).max(40),
  featured: z.boolean(),
  verified: z.boolean(),
  status: z.enum(["draft", "published", "sold", "rented"]),
  details: z.record(z.string(), z.unknown()),
});

/**
 * Optional attributes from the `d.<key>` inputs. Fields that don't apply to this
 * category/type/purpose are dropped, as are empty values and unknown options.
 */
function readDetails(fd: FormData, ctx: Ctx): PropertyDetails {
  const out: Record<string, unknown> = {};
  for (const f of DETAIL_SECTIONS.flatMap((s) => s.fields)) {
    if (!applies(f, ctx)) continue;
    const k = `d.${f.key}`;
    if (f.kind === "flag") {
      if (bool(fd, k)) out[f.key] = true;
    } else if (f.kind === "multi") {
      const v = fd.getAll(k).map(String).filter((o) => f.options.includes(o));
      if (v.length) out[f.key] = v;
    } else if (f.kind === "select") {
      const v = text(fd, k);
      if (f.options.includes(v)) out[f.key] = v;
    } else if (f.kind === "text" || f.kind === "date") {
      const v = text(fd, k).slice(0, 120);
      if (v) out[f.key] = v;
    } else {
      const v = optNumber(fd, k);
      if (v !== null && Number.isFinite(v) && v >= 0) out[f.key] = f.kind === "number" ? Math.round(v * 10) / 10 : Math.round(v);
    }
  }
  const unit = text(fd, "d.areaUnit");
  if (AREA_UNITS.some((u) => u.value === unit) && unit !== "sqft") out.areaUnit = unit;
  return out as PropertyDetails;
}

function read(fd: FormData) {
  const type = text(fd, "type");
  const purpose = text(fd, "purpose") as Purpose;
  const category = (text(fd, "category") || categoryOf(type)) as PropertyCategory;
  const plot = isPlot(type);
  return schema.safeParse({
    title: text(fd, "title"),
    category,
    type,
    purpose,
    city: cleanCity(text(fd, "city") === "__new" ? text(fd, "new_city") : text(fd, "city")),
    locality: text(fd, "locality"),
    price: optNumber(fd, "price") ?? undefined,
    area: optNumber(fd, "area") ?? undefined,
    beds: plot || category === "Commercial" ? null : optNumber(fd, "beds"),
    baths: plot ? null : optNumber(fd, "baths"),
    description: text(fd, "description"),
    images: jsonList(fd, "images"),
    videos: jsonList(fd, "videos"),
    tags: jsonList(fd, "tags"),
    amenities: jsonList(fd, "amenities"),
    featured: bool(fd, "featured"),
    verified: bool(fd, "verified"),
    status: text(fd, "status") || "published",
    details: readDetails(fd, { category, type, purpose }),
  });
}

function refresh(id: string) {
  updateTag(TAGS.properties);
  updateTag(TAGS.cities);
  updateTag(TAGS.property(id));
}

/** Delete Storage objects that were removed from a listing. */
async function removeMedia(db: Awaited<ReturnType<typeof requireAdmin>>["db"], urls: string[]) {
  const paths = urls.map(mediaPath).filter((p): p is string => Boolean(p));
  if (paths.length) await db.storage.from("media").remove(paths);
}

export async function saveProperty(fd: FormData): Promise<ActionResult> {
  const { db, staff } = await requireAdmin();
  const parsed = read(fd);
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const values = parsed.data;
  const existingId = text(fd, "id");
  await ensureCity(db, values.city, values.locality);

  if (existingId) {
    const { data: before } = await db.from("properties").select("images, videos").eq("id", existingId).single();
    const { error } = await db.from("properties").update(values).eq("id", existingId);
    if (error) return fail(error.message);
    if (before) {
      const kept = new Set([...values.images, ...values.videos]);
      await removeMedia(db, [...before.images, ...before.videos].filter((u: string) => !kept.has(u)));
    }
    refresh(existingId);
    return ok("Property saved");
  }

  // New listing: the id doubles as the URL slug and never changes afterwards.
  const base = slugify(text(fd, "slug") || `${values.locality} ${values.title}`) || "property";
  let id = base;
  for (let n = 2; ; n++) {
    const { data } = await db.from("properties").select("id").eq("id", id).maybeSingle();
    if (!data) break;
    id = `${base}-${n}`;
  }
  const { data: first } = await db.from("properties").select("sort_order").order("sort_order").limit(1).maybeSingle();
  const { error } = await db.from("properties").insert({ ...values, id, created_by: staff.id, sort_order: (first?.sort_order ?? 0) - 1 });
  if (error) return fail(error.message);
  refresh(id);
  redirect(`/admin/properties/${id}?created=1`);
}

export async function deleteProperty(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = text(fd, "id");
  const { data } = await db.from("properties").select("images, videos").eq("id", id).single();
  const { error } = await db.from("properties").delete().eq("id", id);
  if (error) return fail(error.message);
  if (data) await removeMedia(db, [...data.images, ...data.videos]);
  refresh(id);
  if (text(fd, "redirect")) redirect("/admin/properties?deleted=1");
  return ok("Property deleted");
}

export async function duplicateProperty(fd: FormData): Promise<ActionResult> {
  const { db, staff } = await requireAdmin();
  const id = text(fd, "id");
  const { data: src } = await db.from("properties").select("*").eq("id", id).single();
  if (!src) return fail("Property not found");
  let copyId = `${id}-copy`;
  for (let n = 2; ; n++) {
    const { data } = await db.from("properties").select("id").eq("id", copyId).maybeSingle();
    if (!data) break;
    copyId = `${id}-copy-${n}`;
  }
  // Media URLs are shared with the original, so they are copied by reference.
  const { error } = await db.from("properties").insert({
    ...src,
    id: copyId,
    title: `${src.title} (copy)`,
    status: "draft",
    featured: false,
    views: 0,
    created_by: staff.id,
    created_at: undefined,
    updated_at: undefined,
    images: [],
    videos: [],
  });
  if (error) return fail(error.message);
  redirect(`/admin/properties/${copyId}?created=1`);
}

export async function setPropertyFlag(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = text(fd, "id");
  const field = text(fd, "field");
  const value = text(fd, "value");
  const patch =
    field === "status" && ["draft", "published", "sold", "rented"].includes(value)
      ? { status: value }
      : field === "featured"
        ? { featured: value === "true" }
        : null;
  if (!patch) return fail("Invalid change");
  const { error } = await db.from("properties").update(patch).eq("id", id);
  if (error) return fail(error.message);
  refresh(id);
  return ok("Updated");
}
