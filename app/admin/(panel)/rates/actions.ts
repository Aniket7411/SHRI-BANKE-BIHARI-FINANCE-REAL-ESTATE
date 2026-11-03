"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { fail, ok, optNumber, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";

interface RateRow {
  bank_id: string;
  loan_id: string;
  rate_min: number;
  rate_max: number | null;
  processing: string;
  note: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const valid = (n: number) => n > 0 && n < 40;

function refresh() {
  updateTag(TAGS.loans); // loan headlines, comparison table, EMI calculator
  updateTag(TAGS.settings); // "Home loans from x%" across the site
}

const same = (a: RateRow, b: RateRow) =>
  Number(a.rate_min) === b.rate_min && (a.rate_max === null ? null : Number(a.rate_max)) === b.rate_max && a.processing === b.processing && a.note === b.note;

/**
 * Save every bank's rate for one loan product in a single round of writes:
 * one upsert for new / changed rows, one delete for cleared rows. Unchanged rows
 * keep their "updated" date.
 */
export async function saveRates(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const loan = text(fd, "loan");
  const bankIds = fd.getAll("bank").map(String);
  if (!loan || !bankIds.length) return fail("Nothing to save");

  const next: RateRow[] = [];
  const cleared: string[] = [];
  const errors: Record<string, string> = {};
  for (const id of bankIds) {
    const min = optNumber(fd, `min_${id}`);
    const max = optNumber(fd, `max_${id}`);
    if (min === null) {
      cleared.push(id);
      continue;
    }
    if (Number.isNaN(min) || !valid(min)) errors[`min_${id}`] = "0–40";
    else if (max !== null && (Number.isNaN(max) || !valid(max) || max < min)) errors[`max_${id}`] = "≥ from";
    else next.push({ bank_id: id, loan_id: loan, rate_min: round2(min), rate_max: max === null || max === min ? null : round2(max), processing: text(fd, `proc_${id}`).slice(0, 80), note: text(fd, `note_${id}`).slice(0, 120) });
  }
  if (Object.keys(errors).length) return fail("Check the highlighted rates", errors);

  const { data: current, error: readError } = await db.from("bank_rates").select("bank_id, loan_id, rate_min, rate_max, processing, note").eq("loan_id", loan);
  if (readError) return fail(`Couldn't load current rates: ${readError.message}`);
  const before = new Map(((current ?? []) as RateRow[]).map((r) => [r.bank_id, r]));
  const changed = next.filter((r) => !before.has(r.bank_id) || !same(before.get(r.bank_id)!, r));
  const removed = cleared.filter((id) => before.has(id));
  if (!changed.length && !removed.length) return ok("No changes");

  const [up, del] = await Promise.all([
    changed.length ? db.from("bank_rates").upsert(changed, { onConflict: "bank_id,loan_id" }) : { error: null },
    removed.length ? db.from("bank_rates").delete().eq("loan_id", loan).in("bank_id", removed) : { error: null },
  ]);
  if (up.error || del.error) return fail(`Couldn't save: ${(up.error ?? del.error)!.message}`);
  refresh();
  const parts = [changed.length && `${changed.length} updated`, removed.length && `${removed.length} removed`].filter(Boolean);
  return ok(`Rates saved (${parts.join(", ")}) — live on the website`);
}

/** Market move (e.g. repo-rate change): shift every bank's rate for this product by the same amount. */
export async function shiftRates(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const loan = text(fd, "loan");
  const by = optNumber(fd, "by");
  if (by === null || Number.isNaN(by) || by === 0 || Math.abs(by) > 5) return fail("Enter a change between -5 and 5, e.g. -0.25");

  const { data, error } = await db.from("bank_rates").select("bank_id, loan_id, rate_min, rate_max, processing, note").eq("loan_id", loan);
  if (error) return fail(error.message);
  const rows = (data ?? []) as RateRow[];
  if (!rows.length) return fail("No bank rates for this loan yet");
  const shifted = rows.map((r) => ({ ...r, rate_min: round2(Number(r.rate_min) + by), rate_max: r.rate_max === null ? null : round2(Number(r.rate_max) + by) }));
  if (shifted.some((r) => !valid(r.rate_min))) return fail("That change would make a rate zero or negative");

  const { error: upError } = await db.from("bank_rates").upsert(shifted, { onConflict: "bank_id,loan_id" });
  if (upError) return fail(`Couldn't update: ${upError.message}`);
  refresh();
  return ok(`All ${rows.length} rates ${by > 0 ? "raised" : "lowered"} by ${Math.abs(by)}%`);
}
