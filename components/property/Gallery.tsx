"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Shop-style photo gallery: thumbnails down the side on desktop (a strip below on phones),
 * a main photo sized to fit the first screen, swipe / arrow keys, and a full-screen view.
 */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const many = images.length > 1;
  const go = (d: number) => setI((v) => (v + d + images.length) % images.length);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      if (e.key === "ArrowRight") setI((v) => (v + 1) % images.length);
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + images.length) % images.length);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full, images.length]);

  if (!images.length) return <div className="aspect-[4/3] rounded-[24px] bg-subtle lg:aspect-auto lg:h-[min(540px,calc(100dvh-240px))]" />;

  const arrows = (big = false) =>
    many && (
      <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
        {[-1, 1].map((d) => (
          <button
            key={d}
            onClick={(e) => {
              e.stopPropagation();
              go(d);
            }}
            aria-label={d < 0 ? "Previous photo" : "Next photo"}
            className={`pointer-events-auto grid place-items-center rounded-full bg-white/95 text-[#111827] shadow-md transition hover:scale-105 ${big ? "size-12" : "size-9"}`}
          >
            {d < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="relative aspect-[4/3] min-w-0 flex-1 overflow-hidden rounded-[24px] bg-subtle sm:aspect-[3/2] lg:aspect-auto lg:h-[min(540px,calc(100dvh-240px))]">
        <AnimatePresence initial={false}>
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            drag={many ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) go(1);
              else if (info.offset.x > 50) go(-1);
            }}
            onClick={() => setFull(true)}
            className="absolute inset-0 cursor-zoom-in"
          >
            <Image src={images[i]} alt={`${title} — photo ${i + 1}`} fill preload={i === 0} sizes="(min-width: 1024px) 55vw, 100vw" className="pointer-events-none object-cover" />
          </motion.div>
        </AnimatePresence>
        {arrows()}
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            {i + 1} / {images.length}
          </span>
          <button onClick={() => setFull(true)} aria-label="View full screen" className="grid size-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/75">
            <Expand className="size-3.5" />
          </button>
        </div>
      </div>

      {many && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:max-h-[min(540px,calc(100dvh-240px))] lg:w-[84px] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
          {images.map((src, k) => (
            <button
              key={src}
              onClick={() => setI(k)}
              onMouseEnter={() => setI(k)}
              aria-label={`Show photo ${k + 1}`}
              aria-current={k === i}
              className={`relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl border-2 transition lg:w-full ${k === i ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {full && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} photos`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95"
            onClick={() => setFull(false)}
          >
            <div className="flex items-center justify-between p-4 text-sm text-white/80">
              <span className="truncate pr-4">{title}</span>
              <span className="flex items-center gap-3">
                {i + 1} / {images.length}
                <button onClick={() => setFull(false)} aria-label="Close" className="grid size-10 place-items-center rounded-full hover:bg-white/10">
                  <X className="size-5 text-white" />
                </button>
              </span>
            </div>
            <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
              <Image src={images[i]} alt={`${title} — photo ${i + 1}`} fill sizes="100vw" className="object-contain" />
              {arrows(true)}
            </div>
            <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto p-4" onClick={(e) => e.stopPropagation()}>
              {images.map((src, k) => (
                <button key={src} onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${k === i ? "border-white" : "border-transparent opacity-60"}`}>
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
