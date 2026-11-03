import { Clapperboard } from "lucide-react";
import { videoInfo } from "@/lib/video";
import { InstagramIcon, YouTubeIcon } from "@/components/ui/BrandIcons";

/**
 * Property video tour: Instagram reels and YouTube Shorts in portrait 9:16 frames,
 * regular YouTube videos full width. Iframes are lazy-loaded. Works in server and client trees.
 */
export function VideoReels({ videos, title, className = "" }: { videos?: string[]; title: string; className?: string }) {
  const items = (videos ?? []).map((url) => ({ url, info: videoInfo(url) }));
  if (!items.length) return null;
  const portrait = items.filter((v) => v.info?.portrait);
  const wide = items.filter((v) => !v.info?.portrait);

  return (
    <section className={className}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl text-ink">
          <Clapperboard className="size-5 text-accent" strokeWidth={1.75} /> Video tour
        </h2>
        <p className="text-xs text-ink-soft">
          {items.length} video{items.length > 1 ? "s" : ""}
        </p>
      </div>

      {portrait.length > 0 && (
        <div
          className={`mt-4 grid gap-3 sm:gap-4 ${
            portrait.length === 1 ? "max-w-[340px] grid-cols-1" : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {portrait.map(({ url, info }, i) => (
            <figure key={url} className="group relative overflow-hidden rounded-2xl border border-line bg-subtle shadow-soft">
              <div className="relative aspect-[9/16] w-full">
                <iframe
                  src={info!.embed}
                  title={`${title} — reel ${i + 1}`}
                  loading="lazy"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  scrolling="no"
                  className="absolute inset-0 size-full"
                />
              </div>
              <a
                href={info!.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 border-t border-line bg-surface px-3 py-2 text-[12px] font-medium text-ink-soft transition hover:text-accent"
              >
                {info!.provider === "instagram" ? <InstagramIcon className="size-3.5" /> : <YouTubeIcon className="size-3.5" />}
                Open on {info!.provider === "instagram" ? "Instagram" : "YouTube"}
              </a>
            </figure>
          ))}
        </div>
      )}

      {wide.length > 0 && (
        <div className="mt-4 grid gap-4">
          {wide.map(({ url, info }) =>
            info ? (
              <iframe
                key={url}
                src={info.embed}
                title={`${title} video tour`}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full rounded-2xl border border-line bg-black"
              />
            ) : (
              // Legacy uploaded clip (uploads are no longer offered in the admin).
              <video key={url} src={url} controls preload="none" playsInline className="aspect-video w-full rounded-2xl border border-line bg-black" />
            ),
          )}
        </div>
      )}
    </section>
  );
}
