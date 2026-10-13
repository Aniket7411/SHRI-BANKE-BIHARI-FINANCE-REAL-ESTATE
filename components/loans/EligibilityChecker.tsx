"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { formatINR, formatPrice, principalFromEmi } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { useSite } from "@/components/layout/SiteProvider";

const FOIR = 0.5; // lenders typically allow ~50% of net income towards EMIs

/** Quick home-loan eligibility estimate from income and existing EMIs. */
export function EligibilityChecker() {
  const s = useSite();
  const [income, setIncome] = useState(75000);
  const [existing, setExisting] = useState(5000);
  const [years, setYears] = useState(20);
  const [age, setAge] = useState(32);

  const maxTenure = Math.max(1, Math.min(30, 60 - age));
  const tenure = Math.min(years, maxTenure);
  const emiCap = Math.max(0, income * FOIR - existing);
  const eligible = principalFromEmi(emiCap, s.rates.home, tenure);
  const pct = Math.min(100, (eligible / 20000000) * 100);

  return (
    <div className="grid overflow-hidden rounded-[28px] border border-line lg:grid-cols-2">
      <div className="space-y-6 bg-surface p-6 sm:p-10">
        <NumberField label="Net monthly income" prefix="₹" value={income} onChange={setIncome} step={1000} />
        <NumberField label="Existing EMIs per month" prefix="₹" value={existing} onChange={setExisting} step={500} />
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Your age" value={age} onChange={(v) => setAge(Math.min(65, Math.max(21, v)))} step={1} />
          <NumberField label="Preferred tenure (yrs)" value={years} onChange={(v) => setYears(Math.min(30, Math.max(1, v)))} step={1} />
        </div>
        {tenure < years && (
          <p className="rounded-xl bg-accent-soft px-4 py-3 text-xs text-ink">
            Tenure capped at {tenure} years so the loan closes by age 60.
          </p>
        )}
      </div>

      <div className="relative flex flex-col justify-between overflow-hidden bg-deep p-6 text-deep-fg sm:p-10">
        <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-deep-fg/60">You could be eligible for up to</p>
          <motion.p key={Math.round(eligible / 10000)} initial={{ opacity: 0.4, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 font-display text-[clamp(2.6rem,6vw,4rem)] leading-none">
            {eligible > 0 ? formatPrice(eligible) : "₹0"}
          </motion.p>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-deep-fg/60">Affordable EMI</dt>
              <dd className="mt-0.5 font-semibold">{formatINR(emiCap)}/mo</dd>
            </div>
            <div>
              <dt className="text-deep-fg/60">At rate / tenure</dt>
              <dd className="mt-0.5 font-semibold">
                {s.rates.home}% · {tenure} yrs
              </dd>
            </div>
          </dl>
        </div>
        <div className="relative mt-8">
          <ButtonLink href="#apply" variant="light" arrow>
            Get a detailed report
          </ButtonLink>
          <p className="mt-3 text-[11px] text-deep-fg/50">Estimate only. Final eligibility depends on lender assessment and credit score.</p>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  prefix,
  value,
  onChange,
  step,
}: {
  label: string;
  prefix?: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      <span className="field flex items-center gap-2 py-0 focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
        {prefix && <span className="text-ink-soft">{prefix}</span>}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent py-3 text-ink tabular-nums focus:outline-none"
        />
      </span>
    </label>
  );
}
