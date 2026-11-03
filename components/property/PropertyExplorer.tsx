"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, BellRing, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BUDGETS } from "@/lib/property-meta";
import type { Property } from "@/lib/types";
import { useFavorites } from "@/lib/useFavorites";
import { useCity } from "@/components/layout/CityProvider";
import { useRequirement } from "@/components/requirements/RequirementProvider";
import { PropertyCard } from "./PropertyCard";
import { PropertyFilters } from "./PropertyFilters";
import { EMPTY, fromQuery, matches, toQuery, type Filters } from "./filters";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Low to High", icon: ArrowUpNarrowWide },
  { value: "price-desc", label: "High to Low", icon: ArrowDownWideNarrow },
  { value: "newest", label: "Newest" },
  { value: "area-desc", label: "Largest" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

export function PropertyExplorer({ items }: { items: Property[] }) {
  const fav = useFavorites();
  const { cities, city, setCity, localities, label } = useCity();
  const [raw, setF] = useState<Filters>(EMPTY);
  // A locality from another city (e.g. after switching city in the header) no longer applies.
  const f = useMemo(() => (raw.locality && !localities.includes(raw.locality) ? { ...raw, locality: "" } : raw), [raw, localities]);
  const [sort, setSort] = useState<Sort>("featured");
  const [drawer, setDrawer] = useState(false);
  const [twoUp, setTwoUp] = useState(true); // phones: two cards per row (default) or one big card
  const set = (patch: Partial<Filters>) => setF((cur) => ({ ...cur, ...patch }));

  // Pick up filters from the URL (homepage search, shared links).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("city");
    if (linked !== null && (linked === "" || cities.some((c) => c.name === linked))) setCity(linked);
    const initial = fromQuery(params);
    // The URL is only readable after hydration, so this one-off sync has to live in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (toQuery(initial).size) setF(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync so a filtered search can be shared or bookmarked.
  useEffect(() => {
    const q = toQuery(f);
    if (city) q.set("city", city);
    const next = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [f, city]);

  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  const results = useMemo(() => {
    const list = items.filter((p) => (!city || p.city === city) && matches(p, f, fav.ids));
    const by: Record<Sort, (a: Property, b: Property) => number> = {
      featured: (a, b) => Number(!!b.featured) - Number(!!a.featured),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      newest: (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      "area-desc": (a, b) => b.area - a.area,
    };
    return list.sort(by[sort]);
  }, [items, city, f, sort, fav.ids]);

  const chips = activeChips(f, set);
  if (city && cities.length > 1) chips.unshift({ label: city, clear: () => setCity("") });
  const heading = [
    f.types.length === 1 ? `${f.types[0]}s` : f.category ? `${f.category} properties` : "Properties",
    f.purpose === "Buy" ? "for sale" : f.purpose === "Rent" ? "for rent" : null,
    `in ${f.locality ? `${f.locality}${city ? `, ${city}` : ""}` : label}`,
  ]
    .filter(Boolean)
    .join(" ");
  const filters = <PropertyFilters f={f} set={set} savedCount={fav.ids.length} />;
  const openRequirement = useRequirement();
  // Start the requirement form from whatever the visitor has filtered so far.
  const askForAlerts = (source: string) =>
    openRequirement(
      {
        purpose: f.purpose === "All" ? undefined : f.purpose,
        city: city || undefined,
        localities: f.locality ? [f.locality] : [],
        category: f.category,
        types: f.types,
        budget: f.purpose === "All" ? -1 : f.budget,
        beds: f.beds,
      },
      source,
    );

  return (
    <section className="container-app py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <FilterRail>{filters}</FilterRail>

        <div className="min-w-0">
          <h2 className="text-[clamp(1.6rem,3vw,2.3rem)] leading-tight text-ink">{heading}</h2>
          <p className="mt-1.5 text-sm text-ink-soft">Verified listings · Honest prices · Free site visits and loan assistance</p>

          {/* Phones/tablets: search, filters and sort stay pinned just below the fixed header. */}
          <div className="sticky top-[calc(var(--offer-bar,0px)+64px)] z-30 -mx-4 mt-4 border-b border-line bg-bg/95 px-4 pt-3 pb-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:mx-0 lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm focus-within:border-accent">
                <Search className="size-4 shrink-0 text-ink-soft" strokeWidth={1.75} />
                <input
                  value={f.q}
                  onChange={(e) => set({ q: e.target.value })}
                  placeholder="Search by locality, type, feature…"
                  aria-label="Search properties"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
                />
                {f.q && (
                  <button onClick={() => set({ q: "" })} aria-label="Clear search">
                    <X className="size-4 text-ink-soft" />
                  </button>
                )}
              </label>
              <button
                onClick={() => setDrawer(true)}
                aria-label="Open filters"
                className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 text-sm font-semibold text-ink shadow-sm lg:hidden"
              >
                <SlidersHorizontal className="size-4" /> <span className="hidden min-[380px]:inline">Filters</span>
                {chips.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-accent-fg">{chips.length}</span>}
              </button>
            </div>

            <ScrollRow className="mt-2.5 lg:mt-3">
              {SORTS.map((s) => {
                const Icon = "icon" in s ? s.icon : null;
                const on = sort === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setSort(s.value)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                      on ? "border-accent bg-accent text-accent-fg shadow-soft" : "border-line bg-surface text-ink hover:border-accent/60"
                    }`}
                  >
                    {Icon && <Icon className="size-4" strokeWidth={1.75} />}
                    {s.label}
                  </button>
                );
              })}
            </ScrollRow>
          </div>

          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.label}
                  onClick={c.clear}
                  className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-strong hover:bg-accent hover:text-accent-fg"
                >
                  {c.label} <X className="size-3" />
                </button>
              ))}
              <button onClick={() => setF({ ...EMPTY })} className="px-2 text-xs font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                Clear all
              </button>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-soft" aria-live="polite">
              <span className="font-semibold text-ink">{results.length}</span> {results.length === 1 ? "property" : "properties"} found
            </p>
            <button
              onClick={() => askForAlerts("Properties · alerts button")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft/60 px-3 py-1.5 text-xs font-semibold text-accent-strong transition hover:border-accent hover:bg-accent hover:text-accent-fg"
            >
              <BellRing className="size-3.5" strokeWidth={2} /> Get alerts
            </button>
            <div className="flex rounded-xl border border-line bg-surface p-0.5 sm:hidden" role="group" aria-label="Layout">
              {[
                { on: true, icon: LayoutGrid, label: "Two per row" },
                { on: false, icon: Rows3, label: "One per row" },
              ].map(({ on, icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => setTwoUp(on)}
                  aria-label={label}
                  aria-pressed={twoUp === on}
                  className={`grid size-8 place-items-center rounded-lg transition ${twoUp === on ? "bg-accent text-accent-fg" : "text-ink-soft"}`}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </button>
              ))}
            </div>
          </div>

          <motion.div layout className={`mt-4 grid sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 ${twoUp ? "grid-cols-2 gap-3" : "gap-5"}`}>
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
                  <PropertyCard property={p} dense={twoUp} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {results.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[28px] border border-dashed border-line py-20 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
                <BellRing className="size-6" strokeWidth={1.75} />
              </span>
              <p className="mt-4 font-display text-2xl text-ink">No matches — yet.</p>
              <p className="mx-auto mt-2 max-w-sm px-4 text-sm text-ink-soft">
                Save this search and we&apos;ll call you with options — and email you the moment a matching property is listed.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 px-4 sm:flex-row">
                <button
                  onClick={() => askForAlerts("Properties · no results")}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-bg transition hover:bg-accent hover:text-accent-fg"
                >
                  <BellRing className="size-4" /> Alert me when it&apos;s listed
                </button>
                <button onClick={() => setF({ ...EMPTY })} className="text-sm font-medium text-accent underline-offset-4 hover:underline">
                  Reset filters
                </button>
              </div>
            </motion.div>
          )}

          {results.length > 0 && <AlertsCard onClick={() => askForAlerts("Properties · alerts card")} />}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 left-0 flex w-[min(360px,92vw)] flex-col bg-surface shadow-2xl"
            >
              <div className="flex-1 overflow-y-auto p-5">{filters}</div>
              <div className="flex gap-2 border-t border-line p-4">
                <button
                  onClick={() => setDrawer(false)}
                  aria-label="Close filters"
                  className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line text-ink"
                >
                  <X className="size-5" />
                </button>
                <button onClick={() => setDrawer(false)} className="flex-1 rounded-2xl bg-accent text-sm font-semibold text-accent-fg">
                  Show {results.length} {results.length === 1 ? "property" : "properties"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** End-of-list nudge to save the search as a requirement. */
function AlertsCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative mt-8 overflow-hidden rounded-[24px] bg-deep p-6 text-deep-fg sm:p-7">
      <BellRing className="absolute -top-4 -right-4 size-32 rotate-12 text-white/5" strokeWidth={1.25} />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">Property alerts</p>
          <p className="mt-2 font-display text-[1.45rem] leading-snug">Didn&apos;t find the one?</p>
          <p className="mt-1.5 text-sm text-deep-fg/70">Tell us what you need once. We&apos;ll shortlist options and alert you when a matching property is listed.</p>
        </div>
        <button
          onClick={onClick}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.97]"
        >
          <BellRing className="size-4" /> Save my requirement
        </button>
      </div>
    </div>
  );
}

/** Desktop filter sidebar: scrolls on its own and hints when more options sit below the fold. */
function FilterRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ top: true, bottom: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdge({
        top: el.scrollTop < 4,
        bottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 4,
      });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <aside className="relative hidden self-start overflow-hidden rounded-[24px] border border-line bg-surface shadow-soft lg:sticky lg:top-[calc(var(--offer-bar,0px)+88px)] lg:block">
      <div ref={ref} className="no-scrollbar max-h-[calc(100dvh-var(--offer-bar,0px)-104px)] overflow-y-auto overscroll-contain p-5">
        <div>{children}</div>
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-surface to-transparent transition-opacity ${edge.top ? "opacity-0" : "opacity-100"}`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-surface via-surface/90 to-transparent pb-3 transition-opacity duration-300 ${edge.bottom ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <button
          onClick={() =>
            ref.current?.scrollBy({
              top: ref.current.clientHeight * 0.7,
              behavior: "smooth",
            })
          }
          tabIndex={edge.bottom ? -1 : 0}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink shadow-soft transition hover:border-accent hover:text-accent"
        >
          More filters <ChevronDown className="size-3.5 animate-bounce" strokeWidth={2.25} />
        </button>
      </div>
    </aside>
  );
}

/** Horizontally scrolling row with edge fades and arrow nudges while more items are off-screen. */
function ScrollRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdge({
        start: el.scrollLeft < 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  const nudge = (dir: 1 | -1) =>
    ref.current?.scrollBy({
      left: dir * ref.current.clientWidth * 0.6,
      behavior: "smooth",
    });
  const fade = "absolute inset-y-0 flex w-14 items-center transition-opacity duration-300";
  const arrow = "grid size-7 place-items-center rounded-full border border-line bg-surface text-ink shadow-soft hover:border-accent hover:text-accent";

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {children}
      </div>
      <div
        className={`${fade} left-0 justify-start bg-gradient-to-r from-bg via-bg/80 to-transparent ${edge.start ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <button onClick={() => nudge(-1)} tabIndex={-1} aria-hidden className={arrow}>
          <ChevronLeft className="size-4" strokeWidth={2.25} />
        </button>
      </div>
      <div
        className={`${fade} right-0 justify-end bg-gradient-to-l from-bg via-bg/80 to-transparent ${edge.end ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <button onClick={() => nudge(1)} tabIndex={-1} aria-hidden className={arrow}>
          <ChevronRight className="size-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}

/** Removable chips for every active filter. */
function activeChips(f: Filters, set: (p: Partial<Filters>) => void) {
  const out: { label: string; clear: () => void }[] = [];
  const list = (k: "types" | "facing" | "position" | "furnishing" | "ownership" | "approval" | "possession" | "structure", suffix = "") =>
    f[k].forEach((v) =>
      out.push({
        label: `${v}${suffix}`,
        clear: () => set({ [k]: f[k].filter((x) => x !== v) }),
      }),
    );

  if (f.purpose !== "All")
    out.push({
      label: f.purpose === "Buy" ? "For sale" : "For rent",
      clear: () => set({ purpose: "All", budget: -1 }),
    });
  if (f.category)
    out.push({
      label: f.category,
      clear: () => set({ category: "", types: [] }),
    });
  list("types");
  if (f.purpose !== "All" && f.budget >= 0)
    out.push({
      label: BUDGETS[f.purpose][f.budget].label,
      clear: () => set({ budget: -1 }),
    });
  f.beds.forEach((b) =>
    out.push({
      label: b === 5 ? "5+ BHK" : `${b} BHK`,
      clear: () => set({ beds: f.beds.filter((x) => x !== b) }),
    }),
  );
  list("facing", " facing");
  list("position");
  if (f.roadMin)
    out.push({
      label: `${f.roadMin} ft+ road`,
      clear: () => set({ roadMin: 0 }),
    });
  list("furnishing");
  list("structure");
  list("possession");
  list("ownership");
  list("approval");
  if (f.locality) out.push({ label: f.locality, clear: () => set({ locality: "" }) });
  if (f.parking) out.push({ label: "Car parking", clear: () => set({ parking: false }) });
  if (f.verified) out.push({ label: "Verified", clear: () => set({ verified: false }) });
  if (f.saved) out.push({ label: "Saved", clear: () => set({ saved: false }) });
  return out;
}
