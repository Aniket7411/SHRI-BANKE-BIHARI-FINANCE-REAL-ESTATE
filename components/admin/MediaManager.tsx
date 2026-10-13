"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Link2, LoaderCircle, Star, Trash2, Video } from "lucide-react";
import { useRef, useState } from "react";
import { uploadMedia } from "@/lib/admin/upload";
import { videoEmbed } from "@/lib/video";
import { useToast } from "@/components/ui/Toast";

/**
 * Upload / reorder / remove media. Submits a JSON array of URLs under `name`.
 * For photos, the first one is the cover.
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
  const input = useRef<HTMLInputElement>(null);
  const isImage = kind === "image";

  async function addFiles(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith(isImage ? "image/" : "video/")).slice(0, max - items.length);
    if (!list.length) return;
    setBusy((b) => b + list.length);
    await Promise.all(
      list.map(async (f) => {
        try {
          if (!isImage && f.size > 50 * 1024 * 1024) throw new Error("Videos must be under 50 MB. Use a YouTube link for longer tours.");
          const url = await uploadMedia(f, folder);
          setItems((all) => [...all, url]);
        } catch (err) {
          toast({ title: `Couldn't upload ${f.name}`, text: (err as Error).message, tone: "error" });
        } finally {
          setBusy((b) => b - 1);
        }
      }),
    );
  }

  function addUrl() {
    const url = window.prompt(isImage ? "Paste an image URL" : "Paste a YouTube or video URL");
    if (!url) return;
    try {
      new URL(url);
      setItems((all) => [...all, url.trim()]);
    } catch {
      toast({ title: "That doesn't look like a valid link", tone: "error" });
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setItems((all) => {
      const next = [...all];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`grid grid-cols-2 gap-3 rounded-2xl border-2 border-dashed p-3 sm:grid-cols-3 lg:grid-cols-4 ${drag ? "border-accent bg-accent-soft" : "border-line"}`}
      >
        {items.map((url, i) => (
          <div key={url + i} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-subtle">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="size-full object-cover" />
            ) : videoEmbed(url) ? (
              <div className="grid size-full place-items-center p-2 text-center text-xs text-ink-soft">
                <span>
                  <Video className="mx-auto mb-1 size-6" strokeWidth={1.5} />
                  YouTube video
                </span>
              </div>
            ) : (
              <video src={url} className="size-full object-cover" muted preload="metadata" />
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
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`busy${i}`} className="grid aspect-[4/3] place-items-center rounded-xl bg-subtle">
            <LoaderCircle className="size-5 animate-spin text-ink-soft" />
          </div>
        ))}
        {items.length + busy < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface text-xs text-ink-soft transition hover:border-accent hover:text-accent"
          >
            {isImage ? <ImagePlus className="size-5" strokeWidth={1.5} /> : <Video className="size-5" strokeWidth={1.5} />}
            {isImage ? "Add photos" : "Upload video"}
            <span className="text-[10px] opacity-70">or drop files here</span>
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-soft">
        <span>{isImage ? "Photos are resized and converted to WebP automatically. The first photo is the cover." : "MP4 up to 50 MB, or paste a YouTube link."}</span>
        <button type="button" onClick={addUrl} className="inline-flex shrink-0 items-center gap-1 font-medium hover:text-accent">
          <Link2 className="size-3.5" /> Add link
        </button>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={isImage ? "image/*" : "video/mp4,video/webm,video/quicktime"}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
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
          setBusy(true);
          try {
            setUrl(await uploadMedia(f, folder));
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
