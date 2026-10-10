"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Building2, Car, Check, FileText, House, Repeat, UserCheck, Wallet } from "lucide-react";
import { useState } from "react";
import type { LoanProduct } from "@/lib/types";
import { whatsappLink } from "@/lib/site";
import { ButtonA, ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";

const icons = { home: House, car: Car, building: Building2, briefcase: Briefcase, wallet: Wallet, repeat: Repeat };

export function LoanProducts({ items }: { items: LoanProduct[] }) {
  const [active, setActive] = useState(items[0].id);
  const p = items.find((x) => x.id === active)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Product rail — horizontal scroller on phones, vertical list on desktop */}
      <div role="tablist" aria-label="Loan products" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
        {items.map((x) => {
          const Icon = icons[x.icon];
          const on = x.id === active;
          return (
            <button
              key={x.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(x.id)}
              className={`relative flex shrink-0 items-center gap-3 rounded-2xl border p-3 pr-5 text-left transition-colors lg:p-4 ${
                on ? "border-ink" : "border-line hover:border-ink/30"
              }`}
            >
              {on && <motion.span layoutId="loan-tab" className="absolute inset-0 rounded-2xl bg-subtle" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
              <span className={`relative grid size-10 place-items-center rounded-xl transition-colors ${on ? "bg-ink text-bg" : "bg-subtle text-ink"}`}>
                <Icon className="size-[18px]" strokeWidth={1.5} />
              </span>
              <span className="relative">
                <span className="block text-sm font-semibold whitespace-nowrap text-ink">{x.name}</span>
                <span className="block text-xs text-ink-soft">from {x.rate}% p.a.</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-line bg-surface">
        <AnimatePresence mode="wait">
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative h-48 sm:h-56">
              <Image src={p.image} alt="" fill sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-deep/85 to-deep/10" />
              <div className="absolute right-6 bottom-5 left-6 flex items-end justify-between gap-4 text-white">
                <div>
                  <h3 className="text-3xl sm:text-4xl">{p.name}</h3>
                  <p className="mt-1 text-sm text-white/75">{p.short}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/70">Starting at</p>
                  <p className="font-display text-4xl">
                    {p.rate}
                    <span className="text-xl text-accent">%</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-line text-center">
              {[
                ["Max tenure", `${p.maxTenureYears} yrs`],
                ["Amount", p.maxAmount],
                ["Processing", p.processing],
              ].map(([k, v]) => (
                <div key={k} className="border-r border-line p-4 last:border-r-0">
                  <p className="text-[11px] tracking-wide text-ink-soft uppercase">{k}</p>
                  <p className="mt-1 text-xs font-semibold text-ink sm:text-sm">{v}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-8 p-6 sm:grid-cols-3 sm:p-8">
              <List title="Highlights" icon={<Check className="size-4" />} items={p.highlights} />
              <List title="Eligibility" icon={<UserCheck className="size-4" />} items={p.eligibility} />
              <List title="Documents" icon={<FileText className="size-4" />} items={p.documents} />
            </div>

            <div className="flex flex-wrap gap-2 border-t border-line p-6 sm:px-8">
              <ButtonLink href="#apply" arrow>
                Apply for {p.name}
              </ButtonLink>
              <ButtonA
                href={whatsappLink(`Hi! I'd like details on a ${p.name}.`)}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                icon={<WhatsAppIcon className="size-4 text-wa" />}
              >
                Ask on WhatsApp
              </ButtonA>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function List({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5 text-sm text-ink">
            <span className="mt-0.5 text-accent">{icon}</span>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
