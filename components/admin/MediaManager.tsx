"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ImagePlus, Link2, LoaderCircle, Plus, Star, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { formatBytes, uploadMediaDetailed } from "@/lib/admin/upload";
import { videoInfo } from "@/lib/video";
import { useToast } from "@/components/ui/Toast";
import { InstagramIcon, YouTubeIcon } from "@/components/ui/BrandIcons";

/** Toast copy for a finished image upload: "Compressed 3.2 MB → 240 KB". */
export function compressionText(before: number, after: number) {
  return after < before ? `Compressed ${formatBytes(before)} → ${formatBytes(after)}` : `${formatBytes(after)}, already optimised`;
}

/**
 * Photos: upload (compressed to WebP in the browser), reorder, remove — the first one is the cover.
 * Videos: links only (Instagram reels or YouTube) so nothing heavy lands in Storage.
 * Submits a JSON array of URLs under `name`.
 */
export function MediaManager({
  name,
  kind,
  folder,
  defaultValue = [],
  max = 30,
}: {
  name: string;
  kind: "image" | "video";
  folder: string;
  defaultValue?: string[];
  max?: number;
}) {
  const toast = useToast();
  const [items, setItems] = useState(defaultValue);
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const isImage = kind === "image";
  const label = isImage ? "photos" : "videos";
  const full = items.length + busy >= max;

  async function addFiles(files: FileList | File[]) {
    if (!isImage) return;
    const all = [...files];
    const images = all.filter((f) => f.type.startsWith("image/"));
    if (images.length < all.length) toast({ title: "Only photos can be uploaded here", text: "Files that aren't images were skipped.", tone: "error" });
    const room = max - items.length - busy;
    if (images.length > room) {
      toast({
        title: `Up to ${max} ${label} per listing`,
        text: room > 0 ? `Only the first ${room} will be added. Remove a photo to add another.` : "Remove a photo before adding another.",
        tone: "error",
      });
    }
    const list = images.slice(0, Math.max(0, room));
    if (!list.length) return;
    setBusy((b) => b + list.length);
    let before = 0;
    let after = 0;
    let done = 0;
    await Promise.all(
      list.map(async (f) => {
        try {
          const r = await uploadMediaDetailed(f, folder);
          before += r.originalSize;
          after += r.size;
          done++;
          setItems((cur) => [...cur, r.url]);
        } catch (err) {
          toast({ title: `Couldn't upload ${f.name}`, text: (err as Error).message, tone: "error" });
        } finally {
          setBusy((b) => b - 1);
        }
      }),
    );
    if (done) toast({ title: done === 1 ? "Photo uploaded" : `${done} photos uploaded`, text: `${compressionText(before, after)}. Save to publish.`, tone: "success" });
  }

  function addLink() {
    const url = link.trim();
    if (!url) return;
    if (items.length >= max) {
      toast({ title: `Up to ${max} ${label} per listing`, tone: "error" });
      return;
    }
    if (isImage) {
      try {
        new URL(url);
      } catch {
        toast({ title: "That doesn't look like a valid link", tone: "error" });
        return;
      }
      setItems((cur) => [...cur, url]);
      toast({ title: "Photo link added", text: "Save to publish.", tone: "success" });
    } else {
      const info = videoInfo(url);
      if (!info) {
        toast({ title: "Paste an Instagram reel or YouTube link", text: "e.g. instagram.com/reel/… or youtube.com/shorts/…", tone: "error" });
        return;
      }
      if (items.some((u) => videoInfo(u)?.id === info.id)) {
        toast({ title: "That video is already added", tone: "error" });
        return;
      }
      setItems((cur) => [...cur, info.url]);
      toast({ title: `${info.provider === "instagram" ? "Instagram reel" : "YouTube video"} added`, text: "Save to publish.", tone: "success" });
    }
    setLink("");
    setLinkOpen(false);
  }

  const move = (i: number, d: -1 | 1) =>
    setItems((all) => {
      const next = [...all];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  const showLinkInput = linkOpen || !isImage;

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <div
        onDragOver={(e) => {
          if (!isImage) return;
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          if (!isImage) return;
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`grid gap-3 rounded-2xl border-2 border-dashed p-3 ${isImage ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"} ${
          drag ? "border-accent bg-accent-soft" : "border-line"
        }`}
      >
        <AnimatePresence initial={false}>
          {items.map((url, i) => (
            <motion.div
              key={url}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={`group relative overflow-hidden rounded-xl bg-subtle ${isImage ? "aspect-[4/3]" : "aspect-[9/14]"}`}
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="size-full object-cover" />
              ) : (
                <VideoTile url={url} />
              )}
              {isImage && i === 0 && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-bg">
                  <Star className="size-3" /> Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 transition sm:opacity-0 sm:group-hover:opacity-100">
                <div className="flex gap-1">
                  <IconBtn label="Move left" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowLeft className="size-3.5" />
                  </IconBtn>
                  <IconBtn label="Move right" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                    <ArrowRight className="size-3.5" />
                  </IconBtn>
                </div>
                <IconBtn label="Remove" onClick={() => setItems((all) => all.filter((_, j) => j !== i))}>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`busy${i}`} className="grid aspect-[4/3] place-items-center rounded-xl bg-subtle">
            <span className="flex flex-col items-center gap-1 text-[10px] text-ink-soft">
              <LoaderCircle className="size-5 animate-spin" />
              Compressing…
            </span>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => (isImage ? input.current?.click() : document.getElementById(`${name}-link`)?.focus())}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface p-2 text-center text-xs text-ink-soft transition hover:border-accent hover:text-accent ${
              isImage ? "aspect-[4/3]" : "aspect-[9/14]"
            }`}
          >
            {isImage ? <ImagePlus className="size-5" strokeWidth={1.5} /> : <Plus className="size-5" strokeWidth={1.5} />}
            {isImage ? "Add photos" : "Add reel / video"}
            <span className="text-[10px] opacity-70">{isImage ? "or drop files here" : "Instagram or YouTube link"}</span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showLinkInput && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
                <input
                  id={`${name}-link`}
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                  disabled={full}
                  placeholder={isImage ? "Paste an image URL" : "Paste Instagram reel or YouTube link"}
                  aria-label={isImage ? "Image URL" : "Instagram reel or YouTube link"}
                  className="field-sm !pl-9"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addLink}
                  disabled={full || !link.trim()}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bg transition hover:bg-accent hover:text-accent-fg disabled:opacity-50 sm:flex-none"
                >
                  <Plus className="size-4" /> Add
                </button>
                {isImage && (
                  <button type="button" onClick={() => setLinkOpen(false)} aria-label="Cancel" className="grid size-9 place-items-center rounded-full border border-line text-ink-soft hover:text-ink">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 flex items-start justify-between gap-3 text-xs text-ink-soft">
        <span>
          {isImage
            ? `Up to ${max} photos, auto-resized to 1600px WebP. The first photo is the cover.`
            : "Paste Instagram reel or YouTube link. Videos stay on Instagram / YouTube, so no storage is used."}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {isImage && !linkOpen && !full && (
            <button type="button" onClick={() => setLinkOpen(true)} className="inline-flex items-center gap-1 font-medium hover:text-accent">
              <Link2 className="size-3.5" /> Add link
            </button>
          )}
          <span className="tabular-nums">
            {items.length}/{max}
          </span>
        </span>
      </div>
      {isImage && (
        <input
          ref={input}
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}

/** Preview tile for a video link (YouTube thumbnail, Instagram badge, or a legacy uploaded clip). */
function VideoTile({ url }: { url: string }) {
  const info = videoInfo(url);
  if (!info) return <video src={url} className="size-full object-cover" muted preload="metadata" />;
  return (
    <a href={info.url} target="_blank" rel="noreferrer" title="Open video" className="relative flex size-full flex-col items-center justify-center gap-2 p-2 text-center">
      {info.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={info.thumb} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" />
      )}
      <span className="relative grid size-10 place-items-center rounded-full bg-white/90 text-gray-900 shadow">
        {info.provider === "instagram" ? <InstagramIcon className="size-5" /> : <YouTubeIcon className="size-5 text-red-600" />}
      </span>
      <span className="relative rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
        {info.provider === "instagram" ? "Instagram reel" : info.portrait ? "YouTube Short" : "YouTube video"}
      </span>
    </a>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 place-items-center rounded-full bg-white/90 text-gray-900 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Single-image picker (loan banners, testimonial photos). Submits the URL under `name`. */
export function ImagePicker({ name, folder, defaultValue = "" }: { name: string; folder: string; defaultValue?: string }) {
  const toast = useToast();
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={url} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-subtle text-ink-soft hover:border-accent"
      >
        {busy ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-5" strokeWidth={1.5} />
        )}
      </button>
      <div className="flex flex-col items-start gap-1 text-xs">
        <button type="button" onClick={() => input.current?.click()} className="font-medium text-ink hover:text-accent">
          {url ? "Change image" : "Upload image"}
        </button>
        {url && (
          <button type="button" onClick={() => setUrl("")} className="text-ink-soft hover:text-red-600">
            Remove
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (!f.type.startsWith("image/")) {
            toast({ title: "Please choose an image file", tone: "error" });
            return;
          }
          setBusy(true);
          try {
            const r = await uploadMediaDetailed(f, folder);
            setUrl(r.url);
            toast({ title: "Image uploaded", text: `${compressionText(r.originalSize, r.size)}. Save to publish.`, tone: "success" });
          } catch (err) {
            toast({ title: "Upload failed", text: (err as Error).message, tone: "error" });
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
