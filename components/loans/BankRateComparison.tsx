"use client";

import { BadgeCheck, LayoutGrid, Rows3 } from "lucide-react";
import { useState } from "react";
import type { Bank, BankOffer, LoanProduct } from "@/lib/types";
import { whatsappLink } from "@/lib/site";
import { useSite } from "@/components/layout/SiteProvider";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { BankLogo } from "./BankLogo";

/** Rates the way banks quote them: always two decimals (8.40%). */
export const pct = (n: number) => `${n.toFixed(2)}%`;
export const rateText = (o: Pick<BankOffer, "rateMin" | "rateMax">) => (o.rateMax && o.rateMax > o.rateMin ? `${pct(o.rateMin)} – ${pct(o.rateMax)}` : pct(o.rateMin));
export const dateText = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * Bank-wise rate comparison from Admin → Bank rates.
 * "By loan": one product, banks lowest first — a table from md up, cards on phones.
 * "All loans": bank × product grid with a sticky bank column that scrolls sideways on small screens.
 */
export function BankRateComparison({ loans }: { loans: LoanProduct[] }) {
  const s = useSite();
  const withRates = loans.filter((l) => l.banks?.length);
  const [loanId, setLoanId] = useState(withRates[0]?.id ?? "");
  const [view, setView] = useState<"loan" | "all">("loan");
  if (!withRates.length) return null;

  const loan = withRates.find((l) => l.id === loanId) ?? withRates[0];
  const offers = loan.banks!;
  const latest = withRates.flatMap((l) => l.banks!).reduce((a, o) => (o.updatedAt > a ? o.updatedAt : a), "");
  const ask = (bank: string, product: string) => whatsappLink(s, `Hi! I'd like the ${product} offer from ${bank}.`);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Comparison view" className="inline-flex self-start rounded-full border border-line p-1">
          {(
            [
              ["loan", "By loan", Rows3],
              ["all", "All loans", LayoutGrid],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${view === v ? "bg-ink text-bg" : "text-ink-soft hover:text-ink"}`}
            >
              <Icon className="size-4" strokeWidth={1.75} /> {label}
            </button>
          ))}
        </div>
        {latest && <p className="text-xs text-ink-soft">Rates updated {dateText(latest)}</p>}
      </div>

      {view === "loan" ? (
        <>
          <div role="tablist" aria-label="Loan type" className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
            {withRates.map((l) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={l.id === loan.id}
                onClick={() => setLoanId(l.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                  l.id === loan.id ? "border-accent bg-accent text-accent-fg" : "border-line text-ink hover:border-accent"
                }`}
              >
                {l.name} <span className={l.id === loan.id ? "opacity-80" : "text-ink-soft"}>· from {pct(l.rate)}</span>
              </button>
            ))}
          </div>

          {/* md+: table */}
          <div className="mt-5 hidden overflow-hidden rounded-3xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{loan.name} rates by bank, lowest first</caption>
              <thead className="bg-subtle text-xs text-ink-soft">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Bank</th>
                  <th scope="col" className="px-4 py-3 font-medium">Interest rate (p.a.)</th>
                  <th scope="col" className="px-4 py-3 font-medium">Processing fee</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Note</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">Enquire</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {offers.map((o, i) => (
                  <tr key={o.bank.id} className={i === 0 ? "bg-accent-soft/40" : ""}>
                    <th scope="row" className="px-5 py-3 font-normal">
                      <BankName bank={o.bank} best={i === 0} />
                    </th>
                    <td className="px-4 py-3 font-display text-lg whitespace-nowrap text-ink">{rateText(o)}</td>
                    <td className="px-4 py-3 text-ink-soft">{o.processing || "—"}</td>
                    <td className="hidden px-4 py-3 text-xs text-ink-soft lg:table-cell">{o.note || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <AskButton href={ask(o.bank.name, loan.name)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phones: cards */}
          <ul className="mt-5 grid gap-3 md:hidden">
            {offers.map((o, i) => (
              <li key={o.bank.id} className={`rounded-2xl border bg-surface p-4 ${i === 0 ? "border-accent" : "border-line"}`}>
                <div className="flex items-start justify-between gap-3">
                  <BankName bank={o.bank} best={i === 0} />
                  <p className="shrink-0 text-right font-display text-xl leading-tight text-ink">
                    {rateText(o)}
                    <span className="block font-sans text-[10px] text-ink-soft">p.a.</span>
                  </p>
                </div>
                {(o.processing || o.note) && (
                  <dl className="mt-3 grid gap-1 border-t border-line pt-3 text-xs">
                    {o.processing && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-soft">Processing fee</dt>
                        <dd className="text-right text-ink">{o.processing}</dd>
                      </div>
                    )}
                    {o.note && <dd className="text-ink-soft">{o.note}</dd>}
                  </dl>
                )}
                <AskButton href={ask(o.bank.name, loan.name)} full />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <AllLoansGrid loans={withRates} />
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        Indicative starting rates. The final rate depends on your credit profile, loan amount and the bank&apos;s policy on the day — we&apos;ll get you the best offer.
      </p>
    </div>
  );
}

/** Bank × product grid. Lowest rate in each column is highlighted; "—" when the bank doesn't offer it. */
function AllLoansGrid({ loans }: { loans: LoanProduct[] }) {
  const banks = new Map<string, Bank>();
  for (const l of loans) for (const o of l.banks!) banks.set(o.bank.id, o.bank);
  const cell = (l: LoanProduct, bankId: string) => l.banks!.find((o) => o.bank.id === bankId);
  // Banks with the most products first, then by name.
  const rows = [...banks.values()].sort((a, b) => {
    const n = (id: string) => loans.filter((l) => cell(l, id)).length;
    return n(b.id) - n(a.id) || a.name.localeCompare(b.name);
  });

  return (
    <>
      {loans.length > 1 && <p className="mt-4 text-xs text-ink-soft lg:hidden">Swipe the table sideways to see every loan →</p>}
      <div className="mt-3 overflow-x-auto rounded-3xl border border-line bg-surface lg:mt-5">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">Starting rates by bank and loan type</caption>
          <thead className="bg-subtle text-xs text-ink-soft">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-subtle px-4 py-3 font-medium sm:px-5">Bank</th>
              {loans.map((l) => (
                <th key={l.id} scope="col" className="px-4 py-3 text-right font-medium whitespace-nowrap">
                  {l.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((b) => (
              <tr key={b.id}>
                <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-3 font-normal shadow-[1px_0_0_var(--color-line)] sm:px-5">
                  <span className="flex items-center gap-2.5">
                    <BankLogo bank={b} size="sm" />
                    <span className="max-w-[9rem] text-sm leading-tight font-medium text-ink sm:max-w-none">{b.name}</span>
                  </span>
                </th>
                {loans.map((l) => {
                  const o = cell(l, b.id);
                  const best = o && l.banks![0].bank.id === b.id;
                  return (
                    <td key={l.id} className="px-4 py-3 text-right whitespace-nowrap">
                      {o ? (
                        <span className={`inline-block rounded-lg px-2 py-0.5 font-semibold ${best ? "bg-accent text-accent-fg" : "text-ink"}`} title={best ? "Lowest rate" : undefined}>
                          {pct(o.rateMin)}
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BankName({ bank, best }: { bank: Bank; best: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <BankLogo bank={bank} />
      <span className="min-w-0">
        <span className="block text-sm leading-tight font-semibold text-ink">{bank.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          {bank.kind}
          {best && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg">
              <BadgeCheck className="size-3" /> Best rate
            </span>
          )}
        </span>
      </span>
    </span>
  );
}

function AskButton({ href, full = false }: { href: string; full?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-line px-4 text-xs font-medium whitespace-nowrap text-ink transition hover:border-wa hover:text-wa ${full ? "mt-3 w-full" : ""}`}
    >
      <WhatsAppIcon className="size-3.5 text-wa" /> Get this offer
    </a>
  );
}
