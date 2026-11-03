"use client";

import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export interface FilterValues {
  q: string;
  status: string;
  owner: string;
  interest: string;
  source: string;
  from: string;
  to: string;
  sort: string;
}

const qs = (f: Partial<FilterValues>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v && !(k === "sort" && v === "new")) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

/** Search + filters for the leads list. Updates the URL (server renders the results). */
export function LeadFilters({
  values,
  isAdmin,
  staff,
  interests,
  sources,
}: {
  values: FilterValues;
  isAdmin: boolean;
  staff: { id: string; name: string }[];
  interests: string[];
  sources: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(values.q);
  const advanced = Boolean(values.interest || values.source || values.from || values.to || values.sort !== "new");
  const [open, setOpen] = useState(advanced);
  const first = useRef(true);

  const go = (patch: Partial<FilterValues>) => start(() => router.replace(`/admin/leads${qs({ ...values, q, ...patch })}`, { scroll: false }));

  // Debounced search-as-you-type.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (q === values.q) return;
    const t = setTimeout(() => start(() => router.replace(`/admin/leads${qs({ ...values, q })}`, { scroll: false })), 350);
    return () => clearTimeout(t);
  }, [q, values, router]);

  const active = Object.entries(values).filter(([k, v]) => v && k !== "status" && !(k === "sort" && v === "new")).length;
  const select = "field-sm h-9 !py-0 text-[13px]";

  return (
    <div className="mb-4 rounded-2xl border border-line bg-surface p-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search leads</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, phone or L-1024"
            className="field-sm h-10 !pl-9"
            enterKeyHint="search"
          />
          {pending && <LoaderCircle className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-ink-soft" />}
        </label>
        {isAdmin && (
          <select aria-label="Executive" value={values.owner} onChange={(e) => go({ owner: e.target.value })} className={`${select} hidden h-10 w-48 sm:block`}>
            <option value="">Everyone</option>
            <option value="unassigned">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition ${open ? "border-ink text-ink" : "border-line text-ink-soft hover:text-ink"}`}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filters</span>
          {active > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-semibold text-accent-fg">{active}</span>}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="grid grid-cols-2 gap-2 pt-3 md:grid-cols-3 lg:grid-cols-6">
              {isAdmin && (
                <select aria-label="Executive" value={values.owner} onChange={(e) => go({ owner: e.target.value })} className={`${select} col-span-2 sm:hidden`}>
                  <option value="">Everyone</option>
                  <option value="unassigned">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <select aria-label="Interest" value={values.interest} onChange={(e) => go({ interest: e.target.value })} className={select}>
                <option value="">Any interest</option>
                {interests.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
              <select aria-label="Source" value={values.source} onChange={(e) => go({ source: e.target.value })} className={select}>
                <option value="">Any source</option>
                {sources.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <label className="flex flex-col">
                <span className="mb-0.5 text-[10px] font-semibold tracking-wide text-ink-soft uppercase">From</span>
                <input type="date" value={values.from} max={values.to || undefined} onChange={(e) => go({ from: e.target.value })} className={select} />
              </label>
              <label className="flex flex-col">
                <span className="mb-0.5 text-[10px] font-semibold tracking-wide text-ink-soft uppercase">To</span>
                <input type="date" value={values.to} min={values.from || undefined} onChange={(e) => go({ to: e.target.value })} className={select} />
              </label>
              <select aria-label="Sort" value={values.sort} onChange={(e) => go({ sort: e.target.value })} className={`${select} self-end`}>
                <option value="new">Newest first</option>
                <option value="activity">Recent activity</option>
                <option value="follow_up">Follow-up soonest</option>
              </select>
              <button
                type="button"
                disabled={!active && !q}
                onClick={() => {
                  setQ("");
                  start(() => router.replace(`/admin/leads${qs({ status: values.status })}`, { scroll: false }));
                }}
                className="inline-flex h-9 items-center justify-center gap-1 self-end rounded-full text-[13px] text-ink-soft hover:bg-subtle hover:text-ink disabled:opacity-40"
              >
                <X className="size-3.5" /> Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
