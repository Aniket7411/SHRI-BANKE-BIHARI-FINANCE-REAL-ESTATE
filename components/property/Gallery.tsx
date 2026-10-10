"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

/** Swipeable photo gallery with thumbnails. */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const go = (d: number) => setI((v) => (v + d + images.length) % images.length);

  return (
    <div>
      <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] bg-subtle sm:aspect-[16/9]">
        <AnimatePresence initial={false}>
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) go(1);
              else if (info.offset.x > 50) go(-1);
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <Image
              src={images[i]}
              alt={`${title} — photo ${i + 1}`}
              fill
              preload={i === 0}
              sizes="(min-width: 1024px) 62vw, 100vw"
              className="pointer-events-none object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
          {[-1, 1].map((d) => (
            <button
              key={d}
              onClick={() => go(d)}
              aria-label={d < 0 ? "Previous photo" : "Next photo"}
              className="grid size-10 place-items-center rounded-full bg-white text-[#111827] shadow-md transition hover:scale-105"
            >
              {d < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
            </button>
          ))}
        </div>
        <span className="absolute right-4 bottom-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          {i + 1} / {images.length}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {images.map((src, k) => (
          <button
            key={src}
            onClick={() => setI(k)}
            aria-label={`Show photo ${k + 1}`}
            className={`relative aspect-[16/10] overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-bg transition ${
              k === i ? "ring-accent" : "ring-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
