"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { videoInfo } from "@/lib/video";

/** Link field with a live check + small portrait preview, so the admin sees the reel before saving. */
export function ReelLinkInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const info = url ? videoInfo(url) : null;

  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1">
        <input name="url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" className="field-sm" />
        {info && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
            <CircleCheck className="size-3.5" /> {info.provider === "instagram" ? "Instagram reel" : info.portrait ? "YouTube Short" : "YouTube video (shows best as a Short)"} detected
          </p>
        )}
      </div>
      {info && (
        <div className="relative hidden aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-xl border border-line bg-subtle sm:block">
          <iframe src={info.embed} title="Preview" loading="lazy" scrolling="no" className="absolute inset-0 size-full" />
        </div>
      )}
    </div>
  );
}
