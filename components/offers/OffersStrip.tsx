"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Clock, Sparkles, Tag } from "lucide-react";
import { endsLabel, isLive, offerTheme } from "@/lib/offers";
import type { Offer } from "@/lib/types";
import { ease } from "@/components/ui/Reveal";
import { CopyCode } from "./CopyCode";
import { useNow } from "./hooks";

/**
 * "Current offers" strip (home & loans). Evaluated in the browser so only offers
 * inside their start/end window are shown; renders nothing when none are live.
 */
export function OffersStrip({
  offers,
  eyebrow = "Festive offers",
  title = "Offers running right now.",
  className = "",
}: {
  offers: Offer[];
  eyebrow?: string;
  title?: string;
  className?: string;
}) {
  const now = useNow();
  if (now === null) return null;
  const live = offers.filter((o) => isLive(o, now));
  if (!live.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease }}
      aria-label="Current offers"
      className={`container-app ${className}`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="eyebrow">
            <Sparkles className="size-3.5" /> {eyebrow}
          </span>
          <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.2rem)] leading-tight text-ink">{title}</h2>
        </div>
        {live.length > 1 && <p className="hidden text-xs text-ink-soft sm:block">Swipe to see all {live.length}</p>}
      </div>

      <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {live.map((o, i) => (
          <OfferCard key={o.id} offer={o} now={now} index={i} single={live.length === 1} />
        ))}
      </div>
    </motion.section>
  );
}

function OfferCard({ offer: o, now, index, single }: { offer: Offer; now: number; index: number; single: boolean }) {
  const t = offerTheme(o.theme);
  const ends = endsLabel(o, now);
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease, delay: 0.1 + index * 0.08 }}
      whileHover={{ y: -4 }}
      className={`group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-[24px] ${t.card} ${t.glow} ${single ? "w-full sm:col-span-2 lg:col-span-3" : "w-[85%] sm:w-auto"}`}
    >
      <span aria-hidden className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-white/15 blur-3xl transition duration-700 group-hover:scale-125" />
      <div className={`relative flex h-full flex-col gap-4 p-5 sm:p-6 ${single ? "md:flex-row md:items-center md:gap-8" : ""}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.chip}`}>
              <Tag className="size-3" /> {o.appliesTo || "All"}
            </span>
            {ends && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.chip}`}>
                <Clock className="size-3" /> {ends}
              </span>
            )}
          </div>
          <p className="mt-4 font-display text-[clamp(1.6rem,4vw,2.1rem)] leading-[1.05]">{o.discountText || o.title}</p>
          <h3 className="mt-2 text-base font-semibold opacity-95">{o.title}</h3>
          {o.description && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed opacity-80">{o.description}</p>}
        </div>
        <div className={`mt-auto flex flex-wrap items-center gap-2 ${single ? "md:mt-0 md:flex-col md:items-stretch" : ""}`}>
          {o.code && <CopyCode code={o.code} />}
          <Link
            href={o.ctaHref || "/contact"}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
          >
            {o.ctaLabel || "Claim offer"} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
