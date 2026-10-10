"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Car, House, Building2 } from "lucide-react";
import { useState } from "react";
import { calcEmi, formatINR, formatPrice } from "@/lib/format";
import { Reveal } from "@/components/ui/Reveal";

const rates = [
  { id: "home", icon: House, name: "Home Loan", rate: 7.15, tenure: 20, amount: 5000000 },
  { id: "vehicle", icon: Car, name: "Vehicle Loan", rate: 7.55, tenure: 5, amount: 1000000 },
  { id: "lap", icon: Building2, name: "Loan Against Property", rate: 8.75, tenure: 10, amount: 3000000 },
];

/** Dark, interactive rates band: pick a product, see an instant EMI. */
export function RatesBand() {
  const [active, setActive] = useState(0);
  const r = rates[active];
  const emi = calcEmi(r.amount, r.rate, r.tenure).emi;

  return (
    <section className="relative overflow-hidden bg-deep py-20 text-deep-fg sm:py-28">
      <div aria-hidden className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full bg-accent/15 blur-[120px]" />
      <div className="container-app relative grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <Reveal>
          <span className="eyebrow">Today&apos;s best rates</span>
          <h2 className="mt-4 text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05]">
            Lower rates. <em className="text-accent">Lighter EMIs.</em>
          </h2>
          <p className="mt-4 max-w-md text-deep-fg/70">
            We compare offers from leading banks and NBFCs, so you don&apos;t have to. Tap a loan to see what your EMI could look like.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-deep-fg/60">
              {r.name} · {formatPrice(r.amount)} · {r.tenure} yrs
            </p>
            <motion.p key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-1 font-display text-4xl sm:text-5xl">
              {formatINR(emi)}
              <span className="font-sans text-base text-deep-fg/60"> /month</span>
            </motion.p>
            <Link href="/loans#emi" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              Customise in EMI calculator <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-3">
          {rates.map((x, i) => {
            const Icon = x.icon;
            const on = i === active;
            return (
              <Reveal key={x.id} delay={i * 0.08}>
                <button
                  onClick={() => setActive(i)}
                  aria-pressed={on}
                  className={`relative flex w-full items-center gap-5 overflow-hidden rounded-3xl border p-5 text-left transition-colors duration-300 sm:p-6 ${
                    on ? "border-accent" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  {on && <motion.span layoutId="rate-bg" className="absolute inset-0 bg-accent/10" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                  <span className={`relative grid size-12 shrink-0 place-items-center rounded-2xl transition-colors ${on ? "bg-accent text-accent-fg" : "bg-white/5 text-deep-fg"}`}>
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <span className="relative flex-1">
                    <span className="block text-base font-semibold">{x.name}</span>
                    <span className="block text-sm text-deep-fg/60">Starting from</span>
                  </span>
                  <span className="relative font-display text-3xl sm:text-4xl">
                    {x.rate}
                    <span className="text-lg text-accent">%</span>
                  </span>
                </button>
              </Reveal>
            );
          })}
          <p className="px-2 text-xs text-deep-fg/50">Rates are indicative and depend on lender policy and credit profile.</p>
        </div>
      </div>
    </section>
  );
}
