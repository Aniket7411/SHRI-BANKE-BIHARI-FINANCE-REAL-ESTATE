"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock, Gift, X } from "lucide-react";
import { useEffect, useState } from "react";
import { endsLabel, isLive, offerTheme } from "@/lib/offers";
import type { Offer } from "@/lib/types";
import { CopyCode } from "./CopyCode";
import { setFlag, useFlag, useNow } from "./hooks";

const DELAY_MS = 3500;

/** Once-per-visitor offer popup for the first live offer with `showPopup`. */
export function OfferPopup({ offers }: { offers: Offer[] }) {
  const now = useNow();
  const pathname = usePathname();
  const offer = now === null ? undefined : offers.find((o) => o.showPopup && isLive(o, now));
  const key = `sbb:offer-popup:${offer?.id ?? "none"}`;
  const seen = useFlag(key);
  const [open, setOpen] = useState(false);

  // Don't interrupt someone who is already applying / enquiring.
  const quietPage = pathname.startsWith("/contact") || pathname.startsWith("/careers");

  useEffect(() => {
    if (!offer || seen || quietPage) return;
    const t = setTimeout(() => {
      setOpen(true);
      setFlag(key);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [offer, seen, quietPage, key]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const t = offerTheme(offer?.theme);
  const ends = offer && now !== null ? endsLabel(offer, now) : null;

  return (
    <AnimatePresence>
      {open && offer && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close offer" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-popup-title"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-2xl"
          >
            <div className={`relative overflow-hidden px-6 pt-8 pb-7 sm:px-8 ${t.card}`}>
              <Glow />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                autoFocus
                className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/20 text-white transition hover:bg-black/35"
              >
                <X className="size-4" />
              </button>
              <motion.span
                initial={{ rotate: -20, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
                className="relative grid size-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30"
              >
                <Gift className="size-6" strokeWidth={1.6} />
              </motion.span>
              <p className="relative mt-5 text-[11px] font-semibold tracking-[0.2em] uppercase opacity-85">
                {offer.appliesTo && offer.appliesTo !== "All" ? `${offer.appliesTo} offer` : "Limited-time offer"}
              </p>
              <p className="relative mt-1.5 font-display text-[clamp(1.9rem,8vw,2.6rem)] leading-[1.05]">{offer.discountText || offer.title}</p>
            </div>

            <div className="px-6 pt-5 pb-6 sm:px-8">
              <h2 id="offer-popup-title" className="text-xl text-ink">
                {offer.title}
              </h2>
              {offer.description && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{offer.description}</p>}

              {(offer.code || ends) && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-subtle p-3 text-ink">
                  {offer.code ? (
                    <span className="flex items-center gap-2 text-xs text-ink-soft">
                      Use code <CopyCode code={offer.code} className="text-ink" />
                    </span>
                  ) : (
                    <span />
                  )}
                  {ends && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                      <Clock className="size-3.5" /> {ends}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-full border border-line px-5 text-sm font-medium text-ink-soft transition hover:text-ink sm:flex-1">
                  Maybe later
                </button>
                <Link
                  href={offer.ctaHref || "/contact"}
                  onClick={() => setOpen(false)}
                  className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong sm:flex-1"
                >
                  {offer.ctaLabel || "Claim offer"} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Glow() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <motion.span
        className="absolute -top-16 -right-10 size-48 rounded-full bg-white/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      {[12, 30, 58, 76, 88].map((left, i) => (
        <motion.span
          key={left}
          className="absolute size-1.5 rounded-full bg-amber-100"
          style={{ left: `${left}%`, top: `${20 + ((i * 23) % 60)}%` }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.2, 0.3] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.45 }}
        />
      ))}
    </span>
  );
}
