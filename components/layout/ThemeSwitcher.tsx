"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const THEMES = [
  { id: "ivory", name: "Ivory & Gold", note: "Classic, light", swatch: ["#ffffff", "#a87a2c", "#0f1b2d"] },
  { id: "emerald", name: "Emerald", note: "Fresh, trustworthy", swatch: ["#ffffff", "#157a55", "#0b2a21"] },
  { id: "midnight", name: "Midnight", note: "Dark, premium", swatch: ["#0b1220", "#d4a85a", "#eef1f6"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const THEME_KEY = "sbb:theme";

/** Runs before paint (in <head>) so the saved theme never flashes. */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeSwitcher({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("ivory");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as ThemeId) || "ivory");
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (id: ThemeId) => {
    setTheme(id);
    document.documentElement.dataset.theme = id;
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {}
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", id === "midnight" ? "#0b1220" : "#ffffff");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent"
      >
        <Palette className="size-[18px]" strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute top-12 z-50 w-60 origin-top rounded-2xl border border-line bg-surface p-1.5 shadow-soft ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Theme</p>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => choose(t.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-subtle"
              >
                <span className="flex -space-x-1.5">
                  {t.swatch.map((c) => (
                    <span key={c} className="size-4.5 rounded-full border border-line" style={{ background: c }} />
                  ))}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-ink">{t.name}</span>
                  <span className="block text-xs text-ink-soft">{t.note}</span>
                </span>
                {theme === t.id && <Check className="size-4 text-accent" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
