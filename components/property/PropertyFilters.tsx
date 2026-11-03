"use client";

import { Building2, Check, Filter, Heart, House, Store } from "lucide-react";
import { AREA_UNITS, APPROVAL, BUDGETS, CATEGORIES, FACINGS, FURNISHING, OWNERSHIP, POSITIONS, POSSESSION, PROPERTY_TYPES, STRUCTURE, isPlot } from "@/lib/property-meta";
import { useAreaUnit } from "@/lib/useAreaUnit";
import type { PropertyCategory } from "@/lib/types";
import { useCity } from "@/components/layout/CityProvider";
import { EMPTY, type Filters } from "./filters";

const CATEGORY_ICONS: Record<PropertyCategory, typeof House> = { Residential: House, Commercial: Store, "Semi-commercial": Building2 };
const ROADS = [20, 30, 40, 60];

/** Sidebar filter panel (also used inside the mobile drawer). */
export function PropertyFilters({
  f,
  set,
  savedCount,
}: {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  savedCount: number;
}) {
  const { cities, city, setCity, localities, label } = useCity();
  const [unit, setUnit] = useAreaUnit();
  const toggle = <K extends keyof Filters>(k: K, v: Filters[K] extends (infer T)[] ? T : never) => {
    const cur = f[k] as unknown[];
    set({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<Filters>);
  };
  const types = f.category ? PROPERTY_TYPES[f.category] : Object.values(PROPERTY_TYPES).flat();
  const onlyPlots = f.types.length > 0 && f.types.every(isPlot);
  const showBhk = f.category !== "Commercial" && !onlyPlots;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line pb-4">
        <p className="flex items-center gap-2 text-sm font-bold tracking-wide text-ink uppercase">
          <Filter className="size-4 text-accent" strokeWidth={2} /> Filters
        </p>
        <button onClick={() => set({ ...EMPTY, q: f.q })} className="text-sm font-medium text-accent hover:underline">
          Clear all
        </button>
      </div>

      <Section title="Looking to">
        <div className="grid grid-cols-3 rounded-2xl bg-subtle p-1">
          {(["All", "Buy", "Rent"] as const).map((p) => (
            <button
              key={p}
              onClick={() => set({ purpose: p, budget: -1 })}
              className={`rounded-xl py-2 text-sm font-medium transition ${f.purpose === p ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Property category">
        <div className="grid gap-2">
          {CATEGORIES.map(({ value, hint }) => {
            const Icon = CATEGORY_ICONS[value];
            const on = f.category === value;
            return (
              <button
                key={value}
                onClick={() => set({ category: on ? "" : value, types: [] })}
                aria-pressed={on}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${on ? "bg-accent text-accent-fg shadow-soft" : "bg-subtle text-ink hover:bg-accent-soft"}`}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{value}</span>
                  <span className={`block truncate text-xs ${on ? "text-accent-fg/80" : "text-ink-soft"}`}>{hint}</span>
                </span>
                {on && <Check className="size-4 shrink-0" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Property type">
        <Chips options={types} value={f.types} onToggle={(v) => toggle("types", v)} />
      </Section>

      <Section title="Budget" hint={f.purpose === "All" ? "Choose Buy or Rent to set a budget" : undefined}>
        {f.purpose !== "All" && (
          <div className="flex flex-wrap gap-2">
            {BUDGETS[f.purpose].map((b, i) => (
              <Chip key={b.label} on={f.budget === i} onClick={() => set({ budget: f.budget === i ? -1 : i })}>
                {b.label}
              </Chip>
            ))}
          </div>
        )}
      </Section>

      {showBhk && (
        <Section title="Bedrooms">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip key={n} on={f.beds.includes(n)} onClick={() => toggle("beds", n)}>
                {n === 5 ? "5+ BHK" : `${n} BHK`}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <Section title="Facing" hint="Direction the main entrance faces">
        <div className="grid grid-cols-2 gap-2">
          {FACINGS.map((o) => (
            <Chip key={o} on={f.facing.includes(o)} onClick={() => toggle("facing", o)} block>
              {o}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Position">
        <Chips options={POSITIONS} value={f.position} onToggle={(v) => toggle("position", v)} />
      </Section>

      <Section title="Front road width">
        <div className="flex flex-wrap gap-2">
          {ROADS.map((r) => (
            <Chip key={r} on={f.roadMin === r} onClick={() => set({ roadMin: f.roadMin === r ? 0 : r })}>
              {r} ft+
            </Chip>
          ))}
        </div>
      </Section>

      {!onlyPlots && (
        <>
          <Section title="Furnishing">
            <Chips options={FURNISHING} value={f.furnishing} onToggle={(v) => toggle("furnishing", v)} />
          </Section>
          <Section title="Building">
            <Chips options={STRUCTURE} value={f.structure} onToggle={(v) => toggle("structure", v)} />
          </Section>
          <Section title="Possession">
            <Chips options={POSSESSION} value={f.possession} onToggle={(v) => toggle("possession", v)} />
          </Section>
        </>
      )}

      <Section title="Ownership">
        <Chips options={OWNERSHIP.slice(0, 2)} value={f.ownership} onToggle={(v) => toggle("ownership", v)} />
      </Section>

      <Section title="Approval">
        <Chips options={APPROVAL} value={f.approval} onToggle={(v) => toggle("approval", v)} />
      </Section>

      {cities.length > 1 && (
        <Section title="City">
          <Chips
            options={cities.map((c) => c.name)}
            value={city ? [city] : []}
            onToggle={(c) => {
              setCity(c === city ? "" : c);
              set({ locality: "" });
            }}
          />
        </Section>
      )}

      <Section title="Locality">
        <select value={f.locality} onChange={(e) => set({ locality: e.target.value })} aria-label="Locality" className="w-full rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none">
          <option value="">All of {label}</option>
          {localities.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Section>

      <Section title="More">
        <div className="grid gap-2">
          <Switch on={f.parking} onClick={() => set({ parking: !f.parking })}>
            With car parking
          </Switch>
          <Switch on={f.verified} onClick={() => set({ verified: !f.verified })}>
            Verified listings only
          </Switch>
          <Switch on={f.saved} onClick={() => set({ saved: !f.saved })}>
            <span className="flex items-center gap-1.5">
              <Heart className="size-3.5" /> Saved ({savedCount})
            </span>
          </Switch>
        </div>
      </Section>

      <Section title="Show area in" hint="Converts every listing instantly">
        <div className="grid grid-cols-3 gap-2">
          {AREA_UNITS.map((u) => (
            <button
              key={u.value}
              onClick={() => setUnit(u.value)}
              title={u.long}
              className={`rounded-2xl py-2.5 text-sm font-semibold transition ${unit === u.value ? "bg-accent text-accent-fg shadow-soft" : "border border-line text-ink hover:border-accent"}`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line py-5 last:border-0 last:pb-0">
      <p className="text-xs font-bold tracking-[0.08em] text-ink uppercase">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Chip({ on, onClick, block, children }: { on: boolean; onClick: () => void; block?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${block ? "w-full" : ""} ${
        on ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-ink hover:border-accent/60"
      }`}
    >
      {children}
    </button>
  );
}

function Chips({ options, value, onToggle }: { options: readonly string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} on={value.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

function Switch({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className="flex items-center justify-between rounded-xl px-1 py-1.5 text-sm text-ink">
      {children}
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-line"}`}>
        <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}
