"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import type { Property } from "@/lib/types";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyDetail } from "@/components/property/PropertyDetail";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/** Swipeable, snap-scrolling carousel — feels native on touch devices. */
export function FeaturedProperties({ items }: { items: Property[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Property | null>(null);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="py-16 sm:py-24">
      <div className="container-app flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          eyebrow="Featured listings"
          title={
            <>
              Handpicked homes <em className="text-accent">across Kanpur.</em>
            </>
          }
        />
        <Reveal className="flex items-center gap-2">
          <button onClick={() => scroll(-1)} aria-label="Previous" className="grid size-11 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent">
            <ArrowLeft className="size-4" strokeWidth={1.5} />
          </button>
          <button onClick={() => scroll(1)} aria-label="Next" className="grid size-11 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent">
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </button>
          <ButtonLink href="/properties" variant="outline" arrow className="ml-2">
            View all
          </ButtonLink>
        </Reveal>
      </div>

      <Reveal>
        <div
          ref={track}
          className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 sm:gap-5 sm:px-6 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]"
        >
          {items.map((p) => (
            <div key={p.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]">
              <PropertyCard property={p} onOpen={setSelected} />
            </div>
          ))}
        </div>
      </Reveal>

      <PropertyDetail property={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
