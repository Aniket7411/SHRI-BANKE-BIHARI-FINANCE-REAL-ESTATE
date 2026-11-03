"use client";

import { BellRing, Building2, Home, LandPlot, PhoneCall, Store } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useRequirement } from "./RequirementProvider";

const quick = [
  { label: "Flat", icon: Building2, prefill: { category: "Residential" as const, types: ["Flat"] } },
  { label: "House / Villa", icon: Home, prefill: { category: "Residential" as const, types: ["Independent House", "Villa"] } },
  { label: "Plot", icon: LandPlot, prefill: { category: "Residential" as const, types: ["Residential Plot"] } },
  { label: "Shop / Office", icon: Store, prefill: { category: "Commercial" as const, types: ["Shop", "Office Space"] } },
];

const steps = [
  { icon: BellRing, title: "Tell us once", text: "Buy or rent, area, budget, BHK." },
  { icon: PhoneCall, title: "We shortlist", text: "An advisor calls with verified options." },
  { icon: Building2, title: "First to know", text: "Get an email when a match is listed." },
];

/** Homepage section: "Can't find it? Tell us what you need" → requirement sheet. */
export function RequirementBand() {
  const open = useRequirement();
  return (
    <section className="container-app py-12 sm:py-16">
      <Reveal className="grid gap-8 overflow-hidden rounded-[32px] border border-line bg-surface p-6 shadow-soft sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
        <div>
          <span className="eyebrow">Property alerts</span>
          <h2 className="mt-4 text-[clamp(1.9rem,4.5vw,3rem)] leading-[1.08] text-ink">
            Can&apos;t find the right one? <em className="text-accent">Tell us what you need.</em>
          </h2>
          <p className="mt-4 max-w-lg text-ink-soft">Save your requirement in under a minute. We&apos;ll call you with options and alert you as soon as a matching property is listed.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {quick.map(({ label, icon: Icon, prefill }) => (
              <button
                key={label}
                onClick={() => open(prefill, `Homepage · ${label}`)}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-4 py-2.5 text-sm font-medium text-ink transition hover:border-accent hover:text-accent active:scale-[0.97]"
              >
                <Icon className="size-4" strokeWidth={1.75} /> {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => open(undefined, "Homepage · requirement")}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-bg transition hover:bg-accent hover:text-accent-fg active:scale-[0.97]"
          >
            <BellRing className="size-4" /> Save my requirement
          </button>
        </div>
        <ol className="grid gap-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex items-center gap-4 rounded-2xl bg-subtle/70 p-4">
              <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="size-5" strokeWidth={1.75} />
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-bg">{i + 1}</span>
              </span>
              <span>
                <span className="block font-semibold text-ink">{title}</span>
                <span className="block text-sm text-ink-soft">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
