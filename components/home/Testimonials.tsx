"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { Testimonial } from "@/lib/types";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);

  const go = (d: 1 | -1) => {
    setDir(d);
    setI((v) => (v + d + items.length) % items.length);
  };

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setDir(1);
      setI((v) => (v + 1) % items.length);
    }, 6000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  const t = items[i];

  return (
    <section className="container-app py-20 sm:py-28">
      <SectionHeading align="center" eyebrow="Client stories" title="Kind words from happy homeowners." />

      <div
        className="relative mx-auto mt-12 max-w-3xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Quote aria-hidden className="mx-auto size-10 text-accent" strokeWidth={1} />
        <div className="relative min-h-[260px] sm:min-h-[220px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.figure
              key={i}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(1);
                else if (info.offset.x > 60) go(-1);
              }}
              className="cursor-grab text-center active:cursor-grabbing"
            >
              <blockquote className="mt-6 text-[clamp(1.15rem,2.6vw,1.6rem)] leading-snug font-medium tracking-tight text-ink">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-8 flex items-center justify-center gap-3">
                <Image src={t.avatar} alt="" width={48} height={48} className="size-12 rounded-full object-cover" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-xs text-ink-soft">{t.role}</p>
                </div>
                <span className="ml-2 flex" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }).map((_, k) => (
                    <Star key={k} className="size-3.5 fill-accent text-accent" />
                  ))}
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={() => go(-1)} aria-label="Previous testimonial" className="grid size-11 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent">
            <ArrowLeft className="size-4" strokeWidth={1.5} />
          </button>
          <div className="flex gap-1.5">
            {items.map((_, k) => (
              <button
                key={k}
                onClick={() => {
                  setDir(k > i ? 1 : -1);
                  setI(k);
                }}
                aria-label={`Show testimonial ${k + 1}`}
                className={`h-1.5 rounded-full transition-all duration-500 ${k === i ? "w-8 bg-accent" : "w-1.5 bg-line"}`}
              />
            ))}
          </div>
          <button onClick={() => go(1)} aria-label="Next testimonial" className="grid size-11 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent">
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
