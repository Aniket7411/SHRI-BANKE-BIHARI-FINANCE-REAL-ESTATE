import { PlayCircle } from "lucide-react";
import { videoInfo } from "@/lib/video";
import type { TestimonialReel } from "@/lib/types";
import { Reveal } from "@/components/ui/Reveal";

/** Customer video reviews (Instagram reels / YouTube) in portrait frames, lazy-loaded. Hidden when empty. */
export function VideoReviews({ items }: { items: TestimonialReel[] }) {
  const reels = items.map((r) => ({ ...r, info: videoInfo(r.reelUrl) })).filter((r) => r.info);
  if (!reels.length) return null;
  return (
    <section className="container-app -mt-6 pb-14 sm:-mt-10 sm:pb-16">
      <Reveal className="flex items-center justify-center gap-2 text-sm font-medium text-ink-soft">
        <PlayCircle className="size-4 text-accent" /> Watch our customers tell it
      </Reveal>
      <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-auto sm:grid sm:max-w-4xl sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {reels.slice(0, 6).map((r, i) => (
          <Reveal key={r.reelUrl} delay={i * 0.08} className="w-[72%] shrink-0 snap-center sm:w-auto">
            <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
              <div className={`relative w-full bg-subtle ${r.info!.portrait ? "aspect-[9/16]" : "aspect-video"}`}>
                <iframe
                  src={r.info!.embed}
                  title={`Video review by ${r.name}`}
                  loading="lazy"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  scrolling="no"
                  className="absolute inset-0 size-full"
                />
              </div>
              <figcaption className="px-4 py-3">
                <p className="text-sm font-semibold text-ink">{r.name}</p>
                {r.role && <p className="text-xs text-ink-soft">{r.role}</p>}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
