"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { calcEmi, formatINR, formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";

const presets = [
  { id: "home", label: "Home", rate: 7.15, amount: 4000000, years: 20, maxYears: 30 },
  { id: "vehicle", label: "Vehicle", rate: 7.55, amount: 800000, years: 5, maxYears: 7 },
  { id: "lap", label: "Property", rate: 8.75, amount: 2500000, years: 10, maxYears: 15 },
] as const;

/** Full EMI calculator with principal/interest donut and yearly schedule. */
export function EmiCalculator() {
  const [preset, setPreset] = useState<(typeof presets)[number]["id"]>("home");
  const p = presets.find((x) => x.id === preset)!;
  const [amount, setAmount] = useState<number>(p.amount);
  const [rate, setRate] = useState<number>(p.rate);
  const [years, setYears] = useState<number>(p.years);
  const [showTable, setShowTable] = useState(false);

  const choose = (id: typeof preset) => {
    const n = presets.find((x) => x.id === id)!;
    setPreset(id);
    setAmount(n.amount);
    setRate(n.rate);
    setYears(n.years);
  };

  const { emi, total, interest } = calcEmi(amount, rate, years);
  const schedule = useMemo(() => yearly(amount, rate, years, emi), [amount, rate, years, emi]);

  return (
    <div className="grid overflow-hidden rounded-[28px] border border-line bg-surface lg:grid-cols-[1.1fr_1fr]">
      <div className="p-6 sm:p-10">
        <div role="tablist" aria-label="Loan type" className="inline-flex rounded-full border border-line p-1">
          {presets.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={preset === x.id}
              onClick={() => choose(x.id)}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                preset === x.id ? "text-bg" : "text-ink-soft hover:text-ink"
              }`}
            >
              {preset === x.id && (
                <motion.span layoutId="emi-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
              )}
              <span className="relative">{x.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-8">
          <Slider
            label="Loan amount"
            value={amount}
            display={formatPrice(amount)}
            min={100000}
            max={50000000}
            step={50000}
            onChange={setAmount}
          />
          <Slider
            label="Interest rate (p.a.)"
            value={rate}
            display={`${rate.toFixed(2)}%`}
            min={6}
            max={16}
            step={0.05}
            onChange={setRate}
          />
          <Slider
            label="Tenure"
            value={years}
            display={`${years} ${years === 1 ? "year" : "years"}`}
            min={1}
            max={p.maxYears}
            step={1}
            onChange={setYears}
          />
        </div>
      </div>

      <div className="flex flex-col bg-subtle p-6 sm:p-10">
        <p className="text-sm text-ink-soft">Your monthly EMI</p>
        <motion.p
          key={Math.round(emi)}
          initial={{ opacity: 0.4, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[clamp(2.4rem,6vw,3.5rem)] leading-none text-ink"
        >
          {formatINR(emi)}
        </motion.p>

        <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row">
          <Donut principal={amount} interest={interest} />
          <dl className="w-full flex-1 space-y-4 text-sm">
            <Legend color="var(--chart-1)" label="Principal" value={formatINR(amount)} />
            <Legend color="var(--chart-2)" label="Total interest" value={formatINR(interest)} />
            <div className="border-t border-line pt-4">
              <dt className="text-ink-soft">Total payable</dt>
              <dd className="mt-0.5 text-lg font-semibold text-ink">{formatINR(total)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
          <ButtonLink href="/contact" arrow>
            Get this rate
          </ButtonLink>
          <button
            onClick={() => setShowTable((s) => !s)}
            aria-expanded={showTable}
            className="text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            {showTable ? "Hide" : "View"} yearly schedule
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showTable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line lg:col-span-2"
          >
            <div className="max-h-80 overflow-auto p-4 sm:p-6">
              <table className="w-full text-right text-sm tabular-nums">
                <caption className="sr-only">Yearly repayment schedule</caption>
                <thead className="sticky top-0 bg-surface text-xs text-ink-soft">
                  <tr>
                    <th className="py-2 text-left font-medium">Year</th>
                    <th className="py-2 font-medium">Principal</th>
                    <th className="py-2 font-medium">Interest</th>
                    <th className="py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  {schedule.map((r) => (
                    <tr key={r.year} className="border-t border-line">
                      <td className="py-2 text-left">{r.year}</td>
                      <td>{formatINR(r.principal)}</td>
                      <td>{formatINR(r.interest)}</td>
                      <td>{formatINR(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm text-ink-soft">{label}</span>
        <span className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-ink tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-4"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />
    </label>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-ink-soft">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        {label}
      </dt>
      <dd className="font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/** Two-segment donut with a 2px surface gap and hover read-out in the centre. */
function Donut({ principal, interest }: { principal: number; interest: number }) {
  const [hover, setHover] = useState<"p" | "i" | null>(null);
  const total = principal + interest;
  const r = 62;
  const c = 2 * Math.PI * r;
  const gap = 3;
  const pLen = (principal / total) * c;
  const iLen = c - pLen;
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;

  const segs = [
    { k: "p" as const, len: pLen, off: 0, color: "var(--chart-1)", label: "Principal", v: principal },
    { k: "i" as const, len: iLen, off: pLen, color: "var(--chart-2)", label: "Interest", v: interest },
  ];
  const active = segs.find((s) => s.k === hover);

  return (
    <div className="relative size-44 shrink-0">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90" role="img" aria-label={`Principal ${pct(principal)}, interest ${pct(interest)}`}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="18" />
        {segs.map((s) => (
          <motion.circle
            key={s.k}
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={hover === s.k ? 22 : 18}
            strokeLinecap="butt"
            initial={false}
            animate={{ strokeDasharray: `${Math.max(0, s.len - gap)} ${c}`, strokeDashoffset: -s.off }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setHover(s.k)}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer transition-[stroke-width]"
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[11px] tracking-wide text-ink-soft uppercase">{active ? active.label : "Interest"}</p>
          <p className="font-display text-2xl text-ink">{active ? pct(active.v) : pct(interest)}</p>
          {active && <p className="text-[11px] text-ink-soft tabular-nums">{formatPrice(active.v)}</p>}
        </div>
      </div>
    </div>
  );
}

function yearly(principal: number, rate: number, years: number, emi: number) {
  const r = rate / 12 / 100;
  let bal = principal;
  const rows = [];
  for (let y = 1; y <= years; y++) {
    let pp = 0;
    let ii = 0;
    for (let m = 0; m < 12 && bal > 0; m++) {
      const int = bal * r;
      const pr = Math.min(emi - int, bal);
      ii += int;
      pp += pr;
      bal -= pr;
    }
    rows.push({ year: y, principal: pp, interest: ii, balance: Math.max(0, bal) });
  }
  return rows;
}
