"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, Bath, BedDouble, Heart, MapPin, Ruler } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useFavorites } from "@/lib/useFavorites";
import type { Property } from "@/lib/types";

/** `onOpen` → quick-view sheet; without it the image links to the full detail page. */
export function PropertyCard({ property: p, onOpen }: { property: Property; onOpen?: (p: Property) => void }) {
  const fav = useFavorites();
  const saved = fav.has(p.id);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-surface transition-shadow duration-500 hover:shadow-soft">
      {onOpen ? (
        <button onClick={() => onOpen(p)} className="relative block aspect-[4/3] overflow-hidden" aria-label={`Quick view ${p.title}`}>
          <Media p={p} />
        </button>
      ) : (
        <Link href={`/properties/${p.id}`} className="relative block aspect-[4/3] overflow-hidden" aria-label={`View ${p.title}`}>
          <Media p={p} />
        </Link>
      )}

      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => fav.toggle(p.id)}
        aria-label={saved ? "Remove from saved" : "Save property"}
        aria-pressed={saved}
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white shadow-sm"
      >
        <Heart
          className={`size-4 transition ${saved ? "fill-red-500 text-red-500" : "text-[#111827]"}`}
          strokeWidth={1.75}
        />
      </motion.button>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[17px] leading-snug text-ink">
            <Link href={`/properties/${p.id}`} className="transition-colors hover:text-accent">
              {p.title}
            </Link>
          </h3>
          {p.verified && <BadgeCheck className="mt-1 size-[18px] shrink-0 text-accent" strokeWidth={1.75} aria-label="Verified" />}
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <MapPin className="size-3.5" strokeWidth={1.75} />
          {p.locality}, Kanpur
        </p>
        <div className="mt-auto flex items-center gap-4 border-t border-line pt-4 text-[13px] text-ink-soft">
          {p.beds && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="size-4" strokeWidth={1.5} /> {p.beds} Beds
            </span>
          )}
          {p.baths && (
            <span className="flex items-center gap-1.5">
              <Bath className="size-4" strokeWidth={1.5} /> {p.baths}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Ruler className="size-4" strokeWidth={1.5} /> {p.area.toLocaleString("en-IN")} sq.ft
          </span>
        </div>
      </div>
    </article>
  );
}

function Media({ p }: { p: Property }) {
  return (
    <>
      <Image
        src={p.images[0]}
        alt={p.title}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
        className="object-cover transition-transform duration-[1.2s] ease-app group-hover:scale-[1.06]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      <span className="absolute top-3 left-3 flex gap-1.5">
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#111827]">
          {p.purpose === "Buy" ? "For Sale" : "For Rent"}
        </span>
        <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
          {p.type}
        </span>
      </span>
      <span className="absolute bottom-3 left-4 font-display text-2xl text-white">
        {formatPrice(p.price)}
        {p.purpose === "Rent" && <span className="font-sans text-sm text-white/80"> /mo</span>}
      </span>
    </>
  );
}
