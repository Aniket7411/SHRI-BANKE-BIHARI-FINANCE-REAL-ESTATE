"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Property, PropertyType, Purpose } from "@/lib/types";
import { useFavorites } from "@/lib/useFavorites";
import { PropertyCard } from "./PropertyCard";
import { PropertyDetail } from "./PropertyDetail";

const types: ("All" | PropertyType)[] = ["All", "Apartment", "Villa", "House", "Plot", "Commercial"];
const sorts = {
  featured: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "area-desc": "Largest first",
} as const;

export function PropertyExplorer({ items, localities }: { items: Property[]; localities: string[] }) {
  const fav = useFavorites();
  const [purpose, setPurpose] = useState<Purpose | "All">("All");
  const [type, setType] = useState<(typeof types)[number]>("All");
  const [locality, setLocality] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<keyof typeof sorts>("featured");
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<Property | null>(null);

  // Pick up filters passed from the homepage search (?purpose=&type=&locality=).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("purpose");
    if (p === "Buy" || p === "Rent") setPurpose(p);
    const t = q.get("type") as PropertyType | null;
    if (t && types.includes(t)) setType(t);
    const l = q.get("locality");
    if (l && localities.includes(l)) setLocality(l);
  }, [localities]);

  // Keep the URL in sync so a filtered search can be shared or bookmarked.
  useEffect(() => {
    const q = new URLSearchParams();
    if (purpose !== "All") q.set("purpose", purpose);
    if (type !== "All") q.set("type", type);
    if (locality) q.set("locality", locality);
    const next = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [purpose, type, locality]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter(
      (p) =>
        (purpose === "All" || p.purpose === purpose) &&
        (type === "All" || p.type === type) &&
        (!locality || p.locality === locality) &&
        (!savedOnly || fav.ids.includes(p.id)) &&
        (!q || `${p.title} ${p.locality} ${p.tags.join(" ")}`.toLowerCase().includes(q)),
    );
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "area-desc") sorted.sort((a, b) => b.area - a.area);
    if (sort === "featured") sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [items, purpose, type, locality, query, sort, savedOnly, fav.ids]);

  const activeFilters = Number(purpose !== "All") + Number(type !== "All") + Number(!!locality) + Number(!!query) + Number(savedOnly);
  const reset = () => {
    setPurpose("All");
    setType("All");
    setLocality("");
    setQuery("");
    setSavedOnly(false);
  };

  return (
    <section className="container-app py-10 sm:py-14">
      {/* Sticky, app-style filter bar */}
      <div className="sticky top-[76px] z-30 -mx-1 rounded-[24px] border border-line bg-surface p-2 shadow-soft lg:top-[84px]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-4 py-2.5">
            <Search className="size-4 text-ink-soft" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, locality or feature…"
              aria-label="Search properties"
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X className="size-4 text-ink-soft" />
              </button>
            )}
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <Segmented value={purpose} options={["All", "Buy", "Rent"] as const} onChange={setPurpose} id="purpose" />
            <select value={locality} onChange={(e) => setLocality(e.target.value)} aria-label="Locality" className="shrink-0 rounded-2xl border border-line bg-surface px-3 text-sm text-ink focus:outline-none">
              <option value="">All localities</option>
              {localities.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof sorts)} aria-label="Sort" className="shrink-0 rounded-2xl border border-line bg-surface px-3 text-sm text-ink focus:outline-none">
              {Object.entries(sorts).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="no-scrollbar mt-6 flex items-center gap-2 overflow-x-auto pb-1">
        <SlidersHorizontal className="size-4 shrink-0 text-ink-soft" strokeWidth={1.5} />
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-all ${
              type === t ? "border-ink bg-ink text-bg" : "border-line text-ink-soft hover:border-ink/40 hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => setSavedOnly((s) => !s)}
          aria-pressed={savedOnly}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-all ${
            savedOnly ? "border-red-500 bg-red-500/10 text-red-600" : "border-line text-ink-soft hover:text-ink"
          }`}
        >
          <Heart className={`size-3.5 ${savedOnly ? "fill-current" : ""}`} /> Saved ({fav.ids.length})
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <p className="text-ink-soft" aria-live="polite">
          <span className="font-semibold text-ink">{results.length}</span> {results.length === 1 ? "property" : "properties"} found
        </p>
        {activeFilters > 0 && (
          <button onClick={reset} className="text-accent underline-offset-4 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      <motion.div layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {results.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <PropertyCard property={p} onOpen={setSelected} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {results.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[28px] border border-dashed border-line py-20 text-center">
          <p className="font-display text-2xl text-ink">No matches — yet.</p>
          <p className="mt-2 text-sm text-ink-soft">Try fewer filters, or tell us what you need and we&apos;ll find it.</p>
          <button onClick={reset} className="mt-5 text-sm font-medium text-accent underline-offset-4 hover:underline">
            Reset filters
          </button>
        </motion.div>
      )}

      <PropertyDetail property={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="flex shrink-0 rounded-2xl border border-line bg-surface p-1">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`relative rounded-xl px-3.5 py-1.5 text-sm transition-colors ${value === o ? "text-accent-fg" : "text-ink-soft"}`}>
          {value === o && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-xl bg-accent" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
          <span className="relative">{o}</span>
        </button>
      ))}
    </div>
  );
}
