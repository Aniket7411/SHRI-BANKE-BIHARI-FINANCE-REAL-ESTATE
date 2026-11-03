"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, Compass, Heart, MapPin, Ruler, SignpostBig } from "lucide-react";
import { formatINR, formatPrice } from "@/lib/format";
import { formatArea, summaryLine } from "@/lib/property-meta";
import { useAreaUnit } from "@/lib/useAreaUnit";
import { useFavorites } from "@/lib/useFavorites";
import type { Property } from "@/lib/types";

/**
 * Listing card. Everything links to the full detail page.
 * `dense`: compact version for the two-column grid on phones (full card again from `sm` up).
 */
export function PropertyCard({ property: p, dense = false }: { property: Property; dense?: boolean }) {
  // Phone-only overrides; every class is reset at `sm` so tablets/desktop get the full card.
  const x = (full: string, compact: string) => (dense ? compact : full);
  const fav = useFavorites();
  const [unit] = useAreaUnit();
  const saved = fav.has(p.id);
  const href = `/properties/${p.id}`;
  const d = p.details;
  const meta = [p.purpose === "Buy" && p.area ? `${formatINR(p.price / p.area)}/sq.ft` : null, d.ownership, d.approval, d.furnishing].filter(Boolean);

  return (
    <article className={`group relative flex h-full flex-col overflow-hidden border border-line bg-surface transition-all duration-500 hover:-translate-y-0.5 hover:shadow-soft ${x("rounded-[22px]", "rounded-2xl sm:rounded-[22px]")}`}>
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-subtle" aria-label={`View ${p.title}`}>
        {p.images[0] && (
          <Image
            src={p.images[0]}
            alt={p.title}
            fill
            sizes={`(min-width: 1280px) 30vw, (min-width: 640px) 45vw, ${dense ? "48vw" : "90vw"}`}
            className="object-cover transition-transform duration-[1.2s] ease-app group-hover:scale-[1.06]"
          />
        )}
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
        <span className={`absolute flex flex-wrap gap-1.5 ${x("top-3 left-3", "top-2 left-2 sm:top-3 sm:left-3")}`}>
          <span
            className={`rounded-full bg-emerald-500 font-bold tracking-wide text-white uppercase shadow-sm ${x("px-3 py-1 text-[11px]", "px-2 py-0.5 text-[9.5px] sm:px-3 sm:py-1 sm:text-[11px]")}`}
          >
            {p.purpose === "Buy" ? "For sale" : "For rent"}
          </span>
          <span className={`rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white backdrop-blur ${x("", "hidden sm:inline")}`}>{p.category}</span>
        </span>
        {p.images.length > 1 && (
          <span className={`absolute right-3 bottom-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] text-white backdrop-blur ${x("", "hidden sm:inline")}`}>1/{p.images.length}</span>
        )}
      </Link>

      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => fav.toggle(p.id)}
        aria-label={saved ? "Remove from saved" : "Save property"}
        aria-pressed={saved}
        className={`absolute grid place-items-center rounded-full bg-white shadow-sm ${x("top-3 right-3 size-9", "top-2 right-2 size-7 sm:top-3 sm:right-3 sm:size-9")}`}
      >
        <Heart className={`transition ${x("size-4", "size-3.5 sm:size-4")} ${saved ? "fill-red-500 text-red-500" : "text-[#111827]"}`} strokeWidth={1.75} />
      </motion.button>

      <div className={`flex flex-1 flex-col ${x("p-5", "p-2.5 sm:p-5")}`}>
        {dense && (
          // Phones: price first — it's what people scan for in a two-column grid.
          <p className="font-display text-[17px] leading-tight text-accent sm:hidden">
            {formatPrice(p.price)}
            {p.purpose === "Rent" && <span className="font-sans text-[11px] text-ink-soft">/mo</span>}
          </p>
        )}
        <div className={`flex items-start justify-between ${x("gap-3", "mt-1 gap-1 sm:mt-0 sm:gap-3")}`}>
          <h3 className={`font-display leading-snug text-ink ${x("text-[17px]", "line-clamp-2 text-[13px] sm:line-clamp-none sm:text-[17px]")}`}>
            <Link href={href} className="transition-colors hover:text-accent">
              {p.title}
            </Link>
          </h3>
          {p.verified && <BadgeCheck className={`shrink-0 text-accent ${x("mt-1 size-[18px]", "mt-0.5 size-3.5 sm:mt-1 sm:size-[18px]")}`} strokeWidth={1.75} aria-label="Verified" />}
        </div>
        <p className={`mt-1 text-ink-soft ${x("text-[13px]", "truncate text-[11px] sm:text-[13px]")}`}>{summaryLine(p)}</p>
        <p className={`mt-1 flex items-center text-ink-soft ${x("gap-1.5 text-[13px]", "gap-1 text-[11px] sm:gap-1.5 sm:text-[13px]")}`}>
          <MapPin className={`shrink-0 ${x("size-3.5", "size-3 sm:size-3.5")}`} strokeWidth={1.75} />
          <span className="truncate">
            {p.locality}, {p.city}
          </span>
        </p>

        <p className={`mt-4 font-display text-2xl text-accent ${x("", "hidden sm:block")}`}>
          {formatPrice(p.price)}
          {p.purpose === "Rent" && <span className="font-sans text-sm text-ink-soft"> /month</span>}
        </p>
        {meta.length > 0 && <p className={`mt-0.5 text-xs text-ink-soft ${x("", "hidden sm:block")}`}>{meta.join(" · ")}</p>}

        <div className={`flex flex-wrap gap-1.5 text-xs text-ink ${x("mt-4", "mt-2 sm:mt-4")}`}>
          <Fact icon={Ruler} dense={dense}>
            {formatArea(p.area, unit)}
          </Fact>
          {d.facing && (
            <span className={x("contents", "hidden sm:contents")}>
              <Fact icon={Compass}>{d.facing}</Fact>
            </span>
          )}
          {d.roadWidth ? (
            <span className={x("contents", "hidden sm:contents")}>
              <Fact icon={SignpostBig}>{d.roadWidth} ft road</Fact>
            </span>
          ) : null}
        </div>

        <div className={`mt-auto pt-5 ${x("", "hidden sm:block")}`}>
          <Link href={href} className="block rounded-2xl bg-accent-soft py-3 text-center text-sm font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-accent-fg">
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

function Fact({ icon: Icon, dense = false, children }: { icon: typeof Ruler; dense?: boolean; children: React.ReactNode }) {
  return (
    <span className={`flex items-center gap-1 rounded-full bg-subtle ${dense ? "px-2 py-0.5 text-[10.5px] sm:px-2.5 sm:py-1 sm:text-xs" : "px-2.5 py-1"}`}>
      <Icon className={`text-ink-soft ${dense ? "size-3 sm:size-3.5" : "size-3.5"}`} strokeWidth={1.75} />
      {children}
    </span>
  );
}
