"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clapperboard, MapPin, Play, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { videoInfo } from "@/lib/video";
import { formatPrice } from "@/lib/format";
import type { Reel } from "@/lib/types";
import { InstagramIcon, YouTubeIcon } from "@/components/ui/BrandIcons";

interface ReelsCtx {
  reels: Reel[];
  open: (index?: number) => void;
}

const Ctx = createContext<ReelsCtx>({ reels: [], open: () => {} });
export const useReels = () => useContext(Ctx);

/** Holds the site's reels, renders the full-screen viewer and the floating "Reels" launcher. */
export function ReelsProvider({ reels, children }: { reels: Reel[]; children: React.ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = useCallback((i = 0) => setIndex(Math.max(0, Math.min(i, reels.length - 1))), [reels.length]);
  const value = useMemo(() => ({ reels, open }), [reels, open]);

  return (
    <Ctx value={value}>
      {children}
      {reels.length > 0 && <ReelsLauncher reels={reels} onOpen={() => open(0)} hidden={index !== null} />}
      <AnimatePresence>{index !== null && reels.length > 0 && <ReelViewer reels={reels} index={index} setIndex={setIndex} onClose={() => setIndex(null)} />}</AnimatePresence>
    </Ctx>
  );
}

/** Story-style bubble, bottom-left — opposite the WhatsApp button. Hidden in the admin and on the reel itself. */
function ReelsLauncher({ reels, onOpen, hidden }: { reels: Reel[]; onOpen: () => void; hidden: boolean }) {
  const path = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(t);
  }, []);
  if (path.startsWith("/admin")) return null;
  const cover = reels.find((r) => r.cover)?.cover;

  return (
    <AnimatePresence>
      {ready && !hidden && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          onClick={onOpen}
          aria-label={`Watch ${reels.length} property reel${reels.length > 1 ? "s" : ""}`}
          className="group fixed bottom-[84px] left-4 z-[60] flex items-center gap-2.5 rounded-full bg-surface/95 p-1 pr-4 shadow-soft ring-1 ring-line backdrop-blur md:bottom-6 md:left-6"
        >
          <span className="relative grid size-12 place-items-center rounded-full bg-[conic-gradient(from_200deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)] p-[2.5px]">
            <span className="relative grid size-full place-items-center overflow-hidden rounded-full border-2 border-surface bg-deep">
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
              )}
              <Play className="relative size-4 fill-white text-white" />
            </span>
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-semibold text-ink">Reels</span>
            <span className="block text-[11px] text-ink-soft">
              {reels.length} video{reels.length > 1 ? "s" : ""}
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/** Full-screen vertical player. Only the current reel's iframe is mounted, so nothing loads until it's watched. */
function ReelViewer({ reels, index, setIndex, onClose }: { reels: Reel[]; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const reel = reels[index];
  const info = videoInfo(reel.url)!;
  const [dir, setDir] = useState(1);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (d: 1 | -1) => {
      const j = index + d;
      if (j < 0 || j >= reels.length) return;
      setDir(d);
      setIndex(j);
    },
    [index, reels.length, setIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowRight") go(1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(-1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  // Swipes on the frame's edges / caption (the iframe itself swallows touches).
  const onTouchStart = (e: React.TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;
    if (Math.abs(dy) > Math.abs(dx)) go(dy < 0 ? 1 : -1);
    else go(dx < 0 ? 1 : -1);
  };

  const arrow = "grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-25";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Property reels"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* top bar: progress + close */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 gap-1">
          {reels.map((r, i) => (
            <button key={r.id} onClick={() => setIndex(i)} aria-label={`Reel ${i + 1}`} className="h-1 flex-1 rounded-full bg-white/20 transition-colors">
              <span className={`block h-full rounded-full transition-all duration-300 ${i <= index ? "w-full bg-white" : "w-0"}`} />
            </button>
          ))}
        </div>
        <span className="text-xs font-medium text-white/70 tabular-nums">
          {index + 1}/{reels.length}
        </span>
        <button onClick={onClose} aria-label="Close reels" className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10">
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-6 px-3 py-3 sm:px-6">
        <button onClick={() => go(-1)} disabled={index === 0} aria-label="Previous reel" className={`${arrow} hidden md:grid`}>
          <ChevronLeft className="size-5" />
        </button>

        <div className="relative flex h-full max-h-[820px] min-h-0 w-full max-w-[440px] flex-col">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={reel.id}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, y: d * 60, scale: 0.97 }),
                show: { opacity: 1, y: 0, scale: 1 },
                leave: (d: number) => ({ opacity: 0, y: d * -60, scale: 0.97 }),
              }}
              initial="enter"
              animate="show"
              exit="leave"
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-neutral-900 ring-1 ring-white/10"
            >
              <div className="relative min-h-0 flex-1">
                <div className="absolute inset-0 grid place-items-center text-white/40">
                  <Clapperboard className="size-8 animate-pulse" strokeWidth={1.5} />
                </div>
                <iframe
                  src={info.embed}
                  title={reel.title}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  scrolling="no"
                  className="absolute inset-0 size-full"
                />
              </div>
              <div className="space-y-3 bg-neutral-900 p-4 text-white">
                <p className="line-clamp-2 text-[15px] leading-snug font-semibold">{reel.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {reel.property && (
                    <Link
                      href={`/properties/${reel.property.id}`}
                      onClick={onClose}
                      className="inline-flex min-w-0 flex-1 items-center justify-between gap-3 rounded-full bg-accent py-2 pr-2 pl-4 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {formatPrice(reel.property.price)}
                          {reel.property.purpose === "Rent" ? "/mo" : ""} · {reel.property.locality}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs">View</span>
                    </Link>
                  )}
                  <a
                    href={info.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-medium text-white/85 transition hover:bg-white/20"
                  >
                    {info.provider === "instagram" ? <InstagramIcon className="size-3.5" /> : <YouTubeIcon className="size-3.5" />}
                    {info.provider === "instagram" ? "Instagram" : "YouTube"}
                  </a>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button onClick={() => go(1)} disabled={index === reels.length - 1} aria-label="Next reel" className={`${arrow} hidden md:grid`}>
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* phones: prev / next under the frame */}
      <div className="flex items-center justify-center gap-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <button onClick={() => go(-1)} disabled={index === 0} aria-label="Previous reel" className={arrow}>
          <ChevronUp className="size-5" />
        </button>
        <span className="text-[11px] text-white/50">Swipe for more</span>
        <button onClick={() => go(1)} disabled={index === reels.length - 1} aria-label="Next reel" className={arrow}>
          <ChevronDown className="size-5" />
        </button>
      </div>
    </motion.div>
  );
}
