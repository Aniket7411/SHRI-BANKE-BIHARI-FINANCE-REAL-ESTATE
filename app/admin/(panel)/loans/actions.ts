"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { bool, fail, fieldErrors, lines, ok, optNumber, slugify, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";

const schema = z.object({
  name: z.string().min(2, "Add a name"),
  short: z.string().max(200),
  icon: z.enum(["home", "car", "building", "briefcase", "wallet", "repeat"]),
  rate: z.number({ error: "Enter the rate" }).min(0).max(40, "Rate looks too high"),
  max_tenure_years: z.number({ error: "Enter the tenure" }).int().min(1).max(40),
  max_amount: z.string().max(80),
  processing: z.string().max(120),
  highlights: z.array(z.string()).max(10),
  eligibility: z.array(z.string()).max(15),
  documents: z.array(z.string()).max(20),
  image: z.string(),
  active: z.boolean(),
});

function refresh() {
  updateTag(TAGS.loans);
  updateTag(TAGS.settings);
}

export async function saveLoan(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = schema.safeParse({
    name: text(fd, "name"),
    short: text(fd, "short"),
    icon: text(fd, "icon") || "home",
    rate: optNumber(fd, "rate") ?? undefined,
    max_tenure_years: optNumber(fd, "max_tenure_years") ?? undefined,
    max_amount: text(fd, "max_amount"),
    processing: text(fd, "processing"),
    highlights: lines(fd, "highlights"),
    eligibility: lines(fd, "eligibility"),
    documents: lines(fd, "documents"),
    image: text(fd, "image"),
    active: bool(fd, "active"),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));

  const id = text(fd, "id");
  if (id) {
    const { error } = await db.from("loan_products").update(parsed.data).eq("id", id);
    if (error) return fail(error.message);
    refresh();
    return ok("Loan product saved");
  }

  const newId = slugify(parsed.data.name);
  const { data: last } = await db.from("loan_products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("loan_products").insert({ ...parsed.data, id: newId, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return fail(error.code === "23505" ? "A loan product with this name already exists" : error.message);
  refresh();
  redirect(`/admin/loans/${newId}`);
}

/** Quick rate change from the list page. */
export async function setLoanRate(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const rate = optNumber(fd, "rate");
  if (rate === null || Number.isNaN(rate) || rate < 0 || rate > 40) return fail("Enter a valid rate");
  const { error } = await db.from("loan_products").update({ rate }).eq("id", text(fd, "id"));
  if (error) return fail(error.message);
  refresh();
  return ok(`Rate updated to ${rate}%`);
}

export async function moveLoan(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { data: rows } = await db.from("loan_products").select("id").order("sort_order");
  const ids = (rows ?? []).map((r) => r.id as string);
  const i = ids.indexOf(text(fd, "id"));
  const j = i + (text(fd, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= ids.length) return ok();
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((id, n) => db.from("loan_products").update({ sort_order: n }).eq("id", id)));
  refresh();
  return ok();
}

export async function deleteLoan(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = text(fd, "id");
  if (id === "home" || id === "vehicle") return fail("Home and Vehicle loans drive the rates shown across the site. Hide them instead of deleting.");
  const { error } = await db.from("loan_products").delete().eq("id", id);
  if (error) return fail(error.message);
  refresh();
  if (text(fd, "redirect")) redirect("/admin/loans");
  return ok("Loan product deleted");
}
