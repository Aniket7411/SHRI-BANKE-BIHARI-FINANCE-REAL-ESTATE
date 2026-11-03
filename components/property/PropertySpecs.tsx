"use client";

import { Bath, BedDouble, Building, Compass, KeyRound, Ruler, Sofa, SignpostBig, Tag } from "lucide-react";
import { formatINR } from "@/lib/format";
import { AREA_UNITS, detailGroups, formatArea, fromSqft } from "@/lib/property-meta";
import { useAreaUnit } from "@/lib/useAreaUnit";
import type { Property } from "@/lib/types";

function useFacts(p: Property) {
  const [unit, setUnit] = useAreaUnit();
  const d = p.details;
  const unitLabel = AREA_UNITS.find((u) => u.value === unit)!.label;
  const facts = [
    { icon: Ruler, label: "Area", value: formatArea(p.area, unit) },
    p.beds && { icon: BedDouble, label: "Bedrooms", value: `${p.beds} BHK` },
    p.baths && { icon: Bath, label: "Washrooms", value: p.baths },
    d.facing && { icon: Compass, label: "Facing", value: d.facing },
    d.roadWidth && { icon: SignpostBig, label: "Front road", value: `${d.roadWidth} ft${d.position ? ` · ${d.position}` : ""}` },
    d.furnishing && { icon: Sofa, label: "Furnishing", value: d.furnishing },
    d.floor !== undefined && { icon: Building, label: "Floor", value: `${d.floor === 0 ? "Ground" : d.floor}${d.totalFloors ? ` of ${d.totalFloors}` : ""}` },
    d.possession && { icon: KeyRound, label: "Possession", value: d.possessionDate && d.possession === "Under construction" ? `By ${d.possessionDate}` : d.possession },
    p.purpose === "Buy" && p.area > 0 && { icon: Tag, label: `Price / ${unitLabel}`, value: formatINR(p.price / fromSqft(p.area, unit)) },
  ].filter(Boolean) as { icon: typeof Ruler; label: string; value: string | number }[];
  return { unit, setUnit, facts };
}

function UnitToggle({ unit, setUnit }: ReturnType<typeof useFacts>) {
  return (
    <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Area unit">
      {AREA_UNITS.map((u) => (
        <button
          key={u.value}
          onClick={() => setUnit(u.value)}
          title={u.long}
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${unit === u.value ? "bg-accent text-accent-fg" : "text-ink-soft hover:text-ink"}`}
        >
          {u.label}
        </button>
      ))}
    </div>
  );
}

/** Compact key-facts grid for the summary box next to the photos (first six facts). */
export function KeyFacts({ p }: { p: Property }) {
  const f = useFacts(p);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold tracking-[0.08em] text-ink uppercase">Key facts</p>
        <UnitToggle {...f} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {f.facts.slice(0, 6).map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2.5 bg-surface p-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} />
            <div className="min-w-0">
              <dd className="truncate text-sm font-semibold text-ink">{value}</dd>
              <dt className="text-[11px] text-ink-soft">{label}</dt>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Full grouped spec sheet, in the visitor's chosen area unit. */
export function PropertySpecs({ p }: { p: Property }) {
  const f = useFacts(p);
  const groups = detailGroups(p, f.unit);
  const rest = f.facts.slice(6);

  return (
    <section id="details" className="scroll-mt-28">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl text-ink">Property details</h2>
        <UnitToggle {...f} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Group
          title="Overview"
          rows={[
            { label: "Category", value: p.category },
            { label: "Type", value: p.type },
            { label: "Listed for", value: p.purpose === "Buy" ? "Sale" : "Rent" },
            { label: "Location", value: `${p.locality}, ${p.city}` },
            ...rest.map((x) => ({ label: x.label, value: String(x.value) })),
          ]}
        />
        {groups.map((g) => (
          <Group key={g.title} title={g.title} rows={g.rows} />
        ))}
      </div>
    </section>
  );
}

function Group({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-2xl border border-line">
      <p className="border-b border-line bg-subtle px-4 py-2.5 text-xs font-bold tracking-[0.08em] text-ink uppercase first:rounded-t-2xl">{title}</p>
      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-ink-soft">{r.label}</dt>
            <dd className="text-right font-medium text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
