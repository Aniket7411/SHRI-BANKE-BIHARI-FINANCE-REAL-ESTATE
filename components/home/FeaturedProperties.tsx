"use client";

import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Property } from "@/lib/types";
import { PropertyCard } from "@/components/property/PropertyCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useCity } from "@/components/layout/CityProvider";

const AUTOPLAY_MS = 3800;

/**
 * Snap-scrolling carousel that glides to the next listing on its own. Autoplay pauses while
 * the visitor hovers, touches or focuses it, while it's off-screen, and for reduced motion.
 */
export function FeaturedProperties({ items: all }: { items: Property[] }) {
  const { city, label } = useCity();
  const inCity = city ? all.filter((p) => p.city === city) : all;
  const items = inCity.length ? inCity : all; // a new city with no featured listings yet shows them all
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const playing = !paused && !reduceMotion;
  const [held, setHeld] = useState(false); // hover / touch / focus
  const [visible, setVisible] = useState(false);

  const cards = () => Array.from(track.current?.children ?? []) as HTMLElement[];

  const scrollToCard = useCallback((i: number) => {
    const el = track.current;
    const [first, card] = [cards()[0], cards()[i]];
    if (!el || !first || !card) return;
    el.scrollTo({ left: card.offsetLeft - first.offsetLeft, behavior: "smooth" });
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      const el = track.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (dir === 1 && atEnd) return scrollToCard(0); // loop back to the first listing
      if (dir === -1 && el.scrollLeft <= 8) return scrollToCard(items.length - 1);
      scrollToCard(Math.max(0, Math.min(items.length - 1, active + dir)));
    },
    [active, items.length, scrollToCard],
  );

  // Which card is at the start edge → drives the dots.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const first = cards()[0];
      if (!first) return;
      const width = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0");
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      setActive(atEnd ? items.length - 1 : Math.round(el.scrollLeft / width));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  // New city → start again from its first listing.
  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
  }, [city]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || held || !visible || items.length < 2) return;
    const t = setInterval(() => {
      if (!document.hidden) step(1);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [playing, held, visible, items.length, step]);

  if (!items.length) return null; // live mode with no featured listings: hide the section

  const ctrl = "grid size-11 place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-accent hover:text-accent";

  return (
    <section className="py-10 sm:py-12">
      <div className="container-app flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          eyebrow="Featured listings"
          title={
            <>
              Handpicked homes <em className="text-accent">across {inCity.length ? label : "our cities"}.</em>
            </>
          }
        />
        <Reveal className="flex items-center gap-2">
          <button onClick={() => step(-1)} aria-label="Previous" className={ctrl}>
            <ArrowLeft className="size-4" strokeWidth={1.5} />
          </button>
          <button onClick={() => setPaused(playing)} aria-label={playing ? "Pause carousel" : "Play carousel"} className={`${ctrl} hidden sm:grid`}>
            {playing ? <Pause className="size-4" strokeWidth={1.5} /> : <Play className="size-4" strokeWidth={1.5} />}
          </button>
          <button onClick={() => step(1)} aria-label="Next" className={ctrl}>
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
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onTouchStart={() => setHeld(true)}
          onTouchEnd={() => setTimeout(() => setHeld(false), 2500)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          className="no-scrollbar mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:scroll-px-6 sm:gap-5 sm:px-6 lg:scroll-px-[max(2rem,calc((100vw-90rem)/2+2rem))] lg:px-[max(2rem,calc((100vw-90rem)/2+2rem))]"
        >
          {items.map((p) => (
            <div key={p.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]">
              <PropertyCard property={p} />
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
            {items.map((p, i) => (
              <button
                key={p.id}
                tabIndex={-1}
                onClick={() => scrollToCard(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "w-7 bg-accent" : "w-1.5 bg-line hover:bg-ink-soft"}`}
              />
            ))}
          </div>
        )}
      </Reveal>
    </section>
  );
}
