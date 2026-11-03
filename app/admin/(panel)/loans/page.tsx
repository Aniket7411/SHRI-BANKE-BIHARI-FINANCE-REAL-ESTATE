import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/forms";
import { Badge, ButtonLink, Empty, PageHeader, button } from "@/components/admin/ui";
import { moveLoan, setLoanRate } from "./actions";

export const metadata: Metadata = { title: "Loan products" };

export default async function LoansAdminPage() {
  const { db } = await requireAdmin();
  const [{ data: loans }, { data: rates }] = await Promise.all([
    db.from("loan_products").select("id, name, short, rate, max_tenure_years, active").order("sort_order"),
    db.from("bank_rates").select("loan_id, rate_min, bank:banks(name, active)"),
  ]);
  const best = new Map<string, { rate: number; bank: string; n: number }>();
  for (const r of (rates ?? []) as unknown as { loan_id: string; rate_min: number; bank: { name: string; active: boolean } | null }[]) {
    if (!r.bank?.active) continue;
    const cur = best.get(r.loan_id);
    const rate = Number(r.rate_min);
    best.set(r.loan_id, !cur || rate < cur.rate ? { rate, bank: r.bank.name, n: (cur?.n ?? 0) + 1 } : { ...cur, n: cur.n + 1 });
  }

  return (
    <>
      <PageHeader
        title="Loan products"
        text="What each loan offers. Rates come from Bank rates — the lowest bank rate shows as “from x%” everywhere; the rate here is only used while a product has no bank rates."
        actions={
          <ButtonLink href="/admin/loans/new">
            <Plus className="size-4" /> Add loan product
          </ButtonLink>
        }
      />
      {!loans?.length ? (
        <Empty title="No loan products yet" text="Run the seed script or add one." />
      ) : (
        <div className="grid gap-3">
          {loans.map((l, i) => (
            <div key={l.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
                <ActionButton action={moveLoan} fields={{ id: l.id, dir: "up" }} title="Move up">
                  <ArrowUp className={`size-4 ${i === 0 ? "opacity-30" : ""}`} />
                </ActionButton>
                <ActionButton action={moveLoan} fields={{ id: l.id, dir: "down" }} title="Move down">
                  <ArrowDown className={`size-4 ${i === loans.length - 1 ? "opacity-30" : ""}`} />
                </ActionButton>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-ink">
                  {l.name} {!l.active && <Badge>Hidden</Badge>}
                </p>
                <p className="truncate text-sm text-ink-soft">{l.short}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  Up to {l.max_tenure_years} years ·{" "}
                  <Link href={`/admin/rates?loan=${l.id}`} className="hover:text-accent hover:underline">
                    {best.has(l.id) ? `live: from ${best.get(l.id)!.rate}% (${best.get(l.id)!.bank}) · ${best.get(l.id)!.n} bank${best.get(l.id)!.n === 1 ? "" : "s"}` : "no bank rates yet"}
                  </Link>
                </p>
              </div>
              <ActionForm action={setLoanRate} className="flex items-center gap-2">
                <input type="hidden" name="id" value={l.id} />
                <div className="relative">
                  <input name="rate" type="number" step="0.01" min={0} max={40} defaultValue={Number(l.rate)} aria-label={`${l.name} fallback rate`} title="Used only while no bank rates are entered" className="field-sm w-28 pr-14 font-semibold" />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-soft">% p.a.</span>
                </div>
                <SubmitButton variant="outline">Update</SubmitButton>
              </ActionForm>
              <Link href={`/admin/loans/${l.id}`} className={button("ghost", "h-9")}>
                <Pencil className="size-4" /> Edit details
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
