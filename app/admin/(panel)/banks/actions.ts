"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { fail, fieldErrors, ok, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";
import { BANK_KINDS } from "@/lib/banks";

const schema = z.object({
  name: z.string().min(2, "Add the bank name, e.g. Bank of Baroda").max(80),
  kind: z.enum(BANK_KINDS as [string, ...string[]]),
  logo: z.string().refine((v) => !v || /^(https?:\/\/|\/)\S+$/.test(v), "Upload a logo or leave it empty"),
});

const parse = (fd: FormData) => schema.safeParse({ name: text(fd, "name").replace(/\s+/g, " "), kind: text(fd, "kind") || "Government", logo: text(fd, "logo") });

// Bank names / logos appear inside the loan comparison too.
function refresh() {
  updateTag(TAGS.banks);
  updateTag(TAGS.loans);
}

export async function createBank(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = parse(fd);
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const { data: last } = await db.from("banks").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("banks").insert({ ...parsed.data, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return fail(error.code === "23505" ? `${parsed.data.name} is already in the list` : `Couldn't add the bank: ${error.message}`);
  refresh();
  return ok(`${parsed.data.name} added — now enter its rates in Bank rates`);
}

export async function updateBank(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = parse(fd);
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const { error } = await db.from("banks").update(parsed.data).eq("id", text(fd, "id"));
  if (error) return fail(error.code === "23505" ? "Another bank has this name" : `Couldn't save: ${error.message}`);
  refresh();
  return ok("Bank saved");
}

export async function toggleBank(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const active = text(fd, "active") === "true";
  const { error } = await db.from("banks").update({ active }).eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't update: ${error.message}`);
  refresh();
  return ok(active ? "Bank and its rates are visible on the website" : "Bank and its rates are hidden");
}

/** Swap with the neighbour; only rows whose position changed are written. */
export async function moveBank(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { data: rows } = await db.from("banks").select("id, sort_order").order("sort_order").order("name");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === text(fd, "id"));
  const j = i + (text(fd, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return ok();
  [list[i], list[j]] = [list[j], list[i]];
  const changed = list.flatMap((r, n) => (r.sort_order === n ? [] : [{ id: r.id as string, n }]));
  const results = await Promise.all(changed.map(({ id, n }) => db.from("banks").update({ sort_order: n }).eq("id", id)));
  const error = results.find((r) => r.error)?.error;
  if (error) return fail(`Couldn't reorder: ${error.message}`);
  refresh();
  return ok();
}

export async function deleteBank(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { error } = await db.from("banks").delete().eq("id", text(fd, "id")); // its rates go with it (on delete cascade)
  if (error) return fail(`Couldn't delete: ${error.message}`);
  refresh();
  return ok("Bank deleted");
}
