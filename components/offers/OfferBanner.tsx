"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isLive, offerTheme } from "@/lib/offers";
import type { Offer } from "@/lib/types";
import { CopyCode } from "./CopyCode";
import { setFlag, useFlag, useNow } from "./hooks";

const BAR_H = 40;

/**
 * Slim dismissible announcement bar above the header for the first live offer with
 * `showBanner`. It pushes the fixed header down via the `--offer-bar` CSS variable
 * and slides away once the visitor scrolls.
 */
export function OfferBanner({ offers }: { offers: Offer[] }) {
  const now = useNow();
  const offer = now === null ? undefined : offers.find((o) => o.showBanner && isLive(o, now));
  const key = `sbb:offer-bar:${offer?.id ?? "none"}`;
  const dismissed = useFlag(key);
  const visible = Boolean(offer) && !dismissed;

  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > BAR_H));

  useEffect(() => {
    const root = document.documentElement.style;
    if (!visible) {
      root.removeProperty("--offer-bar");
      root.removeProperty("--offer-bar-space");
      return;
    }
    root.setProperty("--offer-bar", scrolled ? "0px" : `${BAR_H}px`);
    root.setProperty("--offer-bar-space", `${BAR_H}px`);
  }, [visible, scrolled]);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--offer-bar");
      document.documentElement.style.removeProperty("--offer-bar-space");
    },
    [],
  );

  const t = offerTheme(offer?.theme);
  const festive = offer?.theme === "diwali";

  return (
    <AnimatePresence>
      {visible && offer && (
        <motion.div
          role="region"
          aria-label="Current offer"
          initial={{ y: -BAR_H }}
          animate={{ y: scrolled ? -BAR_H : 0 }}
          exit={{ y: -BAR_H }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: BAR_H }}
          className={`fixed inset-x-0 top-0 z-[55] overflow-hidden ${t.bar}`}
        >
          {festive && <Sparkle />}
          <div className="container-app relative flex h-full items-center gap-2 sm:gap-3">
            <Link href={offer.ctaHref || "/contact"} className="group flex min-w-0 flex-1 items-center gap-2 text-[12.5px] sm:justify-center sm:text-sm">
              <motion.span
                aria-hidden
                animate={festive ? { rotate: [0, 14, -10, 0], scale: [1, 1.15, 1] } : undefined}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
                className="shrink-0"
              >
                <Sparkles className="size-4" strokeWidth={1.75} />
              </motion.span>
              <span className="truncate">
                <strong className="font-semibold">{offer.discountText || offer.title}</strong>
                <span className="hidden opacity-90 sm:inline">
                  {" "}
                  · {offer.title}
                  {/* "Diwali Dhamaka on Home Loans" already names it — don't add "on home loan" again */}
                  {offer.appliesTo && offer.appliesTo !== "All" && !offer.title.toLowerCase().includes(offer.appliesTo.toLowerCase()) ? ` on ${offer.appliesTo.toLowerCase()}` : ""}
                </span>
              </span>
              {offer.ctaLabel && (
                <span className="hidden shrink-0 items-center gap-1 font-semibold underline-offset-4 group-hover:underline md:inline-flex">
                  {offer.ctaLabel} <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              )}
            </Link>
            {offer.code && <CopyCode code={offer.code} size="sm" />}
            <button
              type="button"
              onClick={() => setFlag(key)}
              aria-label="Dismiss offer"
              className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-full transition hover:bg-white/15"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A few twinkling dots for festive themes. */
function Sparkle() {
  const dots = [8, 22, 37, 55, 68, 83, 94];
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {dots.map((left, i) => (
        <motion.span
          key={left}
          className="absolute size-1 rounded-full bg-amber-200"
          style={{ left: `${left}%`, top: `${i % 2 ? 28 : 64}%` }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.37 }}
        />
      ))}
    </span>
  );
}
