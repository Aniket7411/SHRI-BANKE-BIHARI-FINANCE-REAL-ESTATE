"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCity } from "./CityProvider";

/** Header pill: "📍 Lucknow ▾" with a small menu. Hidden while there's only one city. */
export function CityPicker() {
  const { cities, city, setCity } = useCity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (cities.length < 2) return null;
  const options = [{ name: "", label: "All cities" }, ...cities.map((c) => ({ name: c.name, label: c.name }))];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`City: ${city || "All cities"}. Change city`}
        className={`flex h-10 items-center gap-1 rounded-full border px-2.5 text-[13px] font-medium transition sm:gap-1.5 sm:px-3 sm:text-sm ${
          open ? "border-accent text-accent" : "border-line text-ink hover:border-accent hover:text-accent"
        }`}
      >
        <MapPin className="size-4 text-accent" strokeWidth={1.75} />
        <span className="max-w-[70px] truncate sm:max-w-[140px]">{city || "All cities"}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Choose your city"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute top-12 right-0 z-10 w-52 origin-top-right overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-soft sm:right-auto sm:left-0 sm:origin-top-left"
          >
            <li className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Show properties in</li>
            {options.map((o) => {
              const on = o.name === city;
              return (
                <li key={o.label}>
                  <button
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      setCity(o.name);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${on ? "bg-accent-soft font-semibold text-accent-strong" : "text-ink hover:bg-subtle"}`}
                  >
                    {o.label}
                    {on && <Check className="size-4" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
