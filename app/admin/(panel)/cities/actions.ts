"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { fail, fieldErrors, jsonList, ok, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";
import { cleanCity } from "@/lib/cities";

const schema = z.object({
  name: z.string().min(2, "Add the city name, e.g. Lucknow").max(60),
  localities: z.array(z.string().max(80)).max(200),
});

const parse = (fd: FormData) => schema.safeParse({ name: cleanCity(text(fd, "name")), localities: [...new Set(jsonList(fd, "localities"))] });

function refresh() {
  updateTag(TAGS.cities);
  updateTag(TAGS.properties);
}

export async function createCity(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = parse(fd);
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const { data: dupe } = await db.from("cities").select("id").ilike("name", parsed.data.name).maybeSingle();
  if (dupe) return fail(`${parsed.data.name} is already in the list`, { name: "This city already exists" });
  const { data: last } = await db.from("cities").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("cities").insert({ ...parsed.data, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return fail(`Couldn't add the city: ${error.message}`);
  refresh();
  return ok(`${parsed.data.name} added — pick it when adding a property`);
}

/** Save localities; a rename also moves every listing in that city to the new name. */
export async function updateCity(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = parse(fd);
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const id = text(fd, "id");
  const { data: before } = await db.from("cities").select("name").eq("id", id).maybeSingle();
  if (!before) return fail("City not found");
  const renamed = before.name !== parsed.data.name;
  if (renamed) {
    const { data: dupe } = await db.from("cities").select("id").ilike("name", parsed.data.name).neq("id", id).maybeSingle();
    if (dupe) return fail(`${parsed.data.name} already exists`, { name: "Another city has this name" });
  }
  const { error } = await db.from("cities").update(parsed.data).eq("id", id);
  if (error) return fail(`Couldn't save: ${error.message}`);
  if (renamed) {
    const { error: moveError } = await db.from("properties").update({ city: parsed.data.name }).eq("city", before.name);
    if (moveError) return fail(`City renamed, but its listings couldn't be moved: ${moveError.message}`);
  }
  refresh();
  return ok(renamed ? `Renamed to ${parsed.data.name}` : "City saved");
}

export async function toggleCity(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const active = text(fd, "active") === "true";
  const { error } = await db.from("cities").update({ active }).eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't update: ${error.message}`);
  refresh();
  return ok(active ? "Visible in the website's city picker" : "Hidden from the city picker");
}

/** Only a city without listings can be deleted — otherwise hide it. */
export async function deleteCity(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = text(fd, "id");
  const { data: row } = await db.from("cities").select("name").eq("id", id).maybeSingle();
  if (!row) return ok();
  const { count } = await db.from("properties").select("*", { count: "exact", head: true }).eq("city", row.name);
  if (count) return fail(`${row.name} still has ${count} listing${count > 1 ? "s" : ""}. Move them to another city, or hide the city instead.`);
  const { error } = await db.from("cities").delete().eq("id", id);
  if (error) return fail(`Couldn't delete: ${error.message}`);
  refresh();
  return ok(`${row.name} deleted`);
}

export async function moveCity(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { data: rows, error } = await db.from("cities").select("id").order("sort_order").order("name");
  if (error) return fail(error.message);
  const ids = (rows ?? []).map((r) => String(r.id));
  const i = ids.indexOf(text(fd, "id"));
  const j = i + (text(fd, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= ids.length) return ok();
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const results = await Promise.all(ids.map((id, n) => db.from("cities").update({ sort_order: n }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(`Couldn't reorder: ${failed.error.message}`);
  refresh();
  return ok("Order updated");
}
