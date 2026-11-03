"use client";

import { Play } from "lucide-react";
import { videoInfo } from "@/lib/video";
import { formatPrice } from "@/lib/format";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { InstagramIcon, YouTubeIcon } from "@/components/ui/BrandIcons";
import { useReels } from "./ReelsProvider";

/** Homepage strip of reel posters; tapping one opens the full-screen viewer. Hidden when there are no reels. */
export function ReelsRail() {
  const { reels, open } = useReels();
  if (!reels.length) return null;

  return (
    <section className="py-10 sm:py-12">
      <div className="container-app">
        <SectionHeading
          eyebrow="Reels"
          title={
            <>
              Walk through it <em className="text-accent">in 30 seconds.</em>
            </>
          }
        />
      </div>
      <Reveal>
        <div className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-6 lg:px-[max(2rem,calc((100vw-90rem)/2+2rem))]">
          {reels.map((r, i) => {
            const provider = videoInfo(r.url)?.provider;
            return (
              <button
                key={r.id}
                onClick={() => open(i)}
                className="group relative aspect-[9/16] w-[42%] shrink-0 snap-start overflow-hidden rounded-2xl bg-deep text-left shadow-soft ring-1 ring-line sm:w-[30%] md:w-[22%] lg:w-[16.5%]"
              >
                {r.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.cover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#ee2a7b55,transparent_60%),radial-gradient(circle_at_80%_90%,#6228d755,transparent_55%)]" />
                )}
                <span className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
                <span className="absolute top-2.5 left-2.5 grid size-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
                  {provider === "youtube" ? <YouTubeIcon className="size-3.5" /> : <InstagramIcon className="size-3.5" />}
                </span>
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-12 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/40 backdrop-blur transition group-hover:scale-110 group-hover:bg-accent group-hover:ring-accent">
                    <Play className="size-5 translate-x-px fill-current" />
                  </span>
                </span>
                <span className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <span className="line-clamp-2 text-[13px] leading-snug font-semibold">{r.title}</span>
                  {r.property && (
                    <span className="mt-1 block truncate text-[11px] text-white/75">
                      {formatPrice(r.property.price)} · {r.property.locality}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
