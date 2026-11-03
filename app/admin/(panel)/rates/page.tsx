import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, TrendingDown } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { ButtonLink, Card, Empty, PageHeader } from "@/components/admin/ui";
import { BankLogo } from "@/components/loans/BankLogo";
import { saveRates, shiftRates } from "./actions";

export const metadata: Metadata = { title: "Bank rates" };

interface BankRow {
  id: string;
  name: string;
  kind: string;
  logo: string;
  active: boolean;
}
interface RateRow {
  bank_id: string;
  loan_id: string;
  rate_min: number;
  rate_max: number | null;
  processing: string;
  note: string;
  updated_at: string;
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function RatesPage({ searchParams }: PageProps<"/admin/rates">) {
  const { db } = await requireAdmin();
  const [{ data: loanData }, { data: bankData, error }, { data: rateData }] = await Promise.all([
    db.from("loan_products").select("id, name, rate, active").order("sort_order"),
    db.from("banks").select("id, name, kind, logo, active").order("sort_order").order("name"),
    db.from("bank_rates").select("bank_id, loan_id, rate_min, rate_max, processing, note, updated_at"),
  ]);
  const loans = (loanData ?? []) as { id: string; name: string; rate: number; active: boolean }[];
  const banks = (bankData ?? []) as BankRow[];
  const rates = (rateData ?? []) as RateRow[];

  const sp = await searchParams;
  const loan = loans.find((l) => l.id === sp.loan) ?? loans[0];
  const forLoan = new Map(rates.filter((r) => r.loan_id === loan?.id).map((r) => [r.bank_id, r]));
  const countFor = (id: string) => rates.filter((r) => r.loan_id === id).length;
  const lowest = [...forLoan.values()].filter((r) => banks.find((b) => b.id === r.bank_id)?.active).sort((a, b) => a.rate_min - b.rate_min)[0];

  return (
    <>
      <PageHeader
        title="Bank rates"
        text="Each bank's current rate per loan. The lowest visible rate becomes the loan's “from x%” everywhere on the website. Leave a row empty if the bank doesn't offer that loan."
        actions={
          <ButtonLink href="/admin/banks" variant="outline">
            <Landmark className="size-4" /> Manage banks
          </ButtonLink>
        }
      />

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Couldn&apos;t load banks: {error.message}. Has migration 0008_banks.sql been run?</p>}

      {!loan ? (
        <Empty title="No loan products" text="Add a loan product first." />
      ) : !banks.length ? (
        <Empty title="No banks yet" text="Add your partner banks first, then come back to enter their rates." action={<ButtonLink href="/admin/banks">Add a bank</ButtonLink>} />
      ) : (
        <>
          <nav aria-label="Loan products" className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
            {loans.map((l) => {
              const on = l.id === loan.id;
              const n = countFor(l.id);
              return (
                <Link
                  key={l.id}
                  href={`/admin/rates?loan=${l.id}`}
                  aria-current={on ? "page" : undefined}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors ${on ? "border-ink bg-ink text-bg" : "border-line text-ink-soft hover:border-ink/30 hover:text-ink"}`}
                >
                  {l.name}
                  <span className={`ml-1.5 text-xs ${on ? "text-bg/70" : "text-ink-soft"}`}>{n ? `${n} bank${n === 1 ? "" : "s"}` : "—"}</span>
                </Link>
              );
            })}
          </nav>

          <p className="mb-4 text-sm text-ink-soft">
            {lowest ? (
              <>
                Website shows <strong className="text-ink">{loan.name} from {Number(lowest.rate_min)}%</strong> ({banks.find((b) => b.id === lowest.bank_id)?.name}).
              </>
            ) : (
              <>
                No bank rates yet — the website shows the product&apos;s own rate, <strong className="text-ink">{Number(loan.rate)}%</strong>.
              </>
            )}
          </p>

          {/* key: fresh inputs when switching loan */}
          <ActionForm key={loan.id} action={saveRates} className="grid gap-3">
            <input type="hidden" name="loan" value={loan.id} />
            <div className="hidden grid-cols-[minmax(0,1.4fr)_96px_96px_minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-4 text-xs font-medium text-ink-soft lg:grid">
              <span>Bank</span>
              <span>From % p.a.</span>
              <span>Up to %</span>
              <span>Processing fee</span>
              <span>Note (optional)</span>
            </div>
            {banks.map((b) => {
              const r = forLoan.get(b.id);
              const best = lowest && lowest.bank_id === b.id;
              return (
                <div
                  key={b.id}
                  className={`grid grid-cols-2 gap-3 rounded-2xl border bg-surface p-3 sm:p-4 lg:grid-cols-[minmax(0,1.4fr)_96px_96px_minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center ${best ? "border-accent" : "border-line"} ${b.active ? "" : "opacity-60"}`}
                >
                  <input type="hidden" name="bank" value={b.id} />
                  <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
                    <BankLogo bank={b} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {b.name}
                        {best && <TrendingDown className="ml-1 inline size-3.5 text-accent" aria-label="Lowest rate" />}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {b.active ? b.kind : "Hidden bank"}
                        {r && ` · updated ${day(r.updated_at)}`}
                      </p>
                    </div>
                  </div>
                  <Field label="From %" name={`min_${b.id}`} className="lg:[&>span:first-child]:sr-only">
                    <input name={`min_${b.id}`} type="number" inputMode="decimal" step="0.01" min={0} max={40} defaultValue={r ? Number(r.rate_min) : ""} placeholder="—" aria-label={`${b.name} from rate`} className="field-sm font-semibold" />
                  </Field>
                  <Field label="Up to %" name={`max_${b.id}`} className="lg:[&>span:first-child]:sr-only">
                    <input name={`max_${b.id}`} type="number" inputMode="decimal" step="0.01" min={0} max={40} defaultValue={r?.rate_max === null || r?.rate_max === undefined ? "" : Number(r.rate_max)} placeholder="optional" aria-label={`${b.name} up to rate`} className="field-sm" />
                  </Field>
                  <Field label="Processing fee" name={`proc_${b.id}`} className="lg:[&>span:first-child]:sr-only">
                    <input name={`proc_${b.id}`} defaultValue={r?.processing ?? ""} placeholder="e.g. 0.35% + GST" aria-label={`${b.name} processing fee`} className="field-sm" />
                  </Field>
                  <Field label="Note" name={`note_${b.id}`} className="lg:[&>span:first-child]:sr-only">
                    <input name={`note_${b.id}`} defaultValue={r?.note ?? ""} placeholder="e.g. Women: 0.05% lower" aria-label={`${b.name} note`} className="field-sm" />
                  </Field>
                </div>
              );
            })}
            <div className="sticky bottom-4 z-10 flex justify-end">
              <SubmitButton className="h-11 px-8 shadow-soft">Save {loan.name} rates</SubmitButton>
            </div>
          </ActionForm>

          {forLoan.size > 0 && (
            <Card title="Market change" text={`Shift every bank's ${loan.name} rate at once — e.g. after an RBI repo-rate change. Use a minus sign to lower.`} className="mt-8">
              <ActionForm action={shiftRates} resetOnSuccess className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="loan" value={loan.id} />
                <Field label="Change by (%)" name="by">
                  <input name="by" type="number" inputMode="decimal" step="0.05" min={-5} max={5} placeholder="-0.25" className="field-sm w-32" />
                </Field>
                <SubmitButton variant="outline">Apply to {forLoan.size} bank{forLoan.size === 1 ? "" : "s"}</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </>
      )}
    </>
  );
}
