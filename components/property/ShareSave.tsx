"use client";

import { Heart, Share2 } from "lucide-react";
import { useFavorites } from "@/lib/useFavorites";
import { useToast } from "@/components/ui/Toast";

export function ShareSave({ id, title }: { id: string; title: string }) {
  const fav = useFavorites();
  const toast = useToast();
  const saved = fav.has(id);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", text: "Share it with family on WhatsApp." });
    } catch {
      /* user cancelled share */
    }
  };

  const btn =
    "inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink transition hover:border-ink/40";

  return (
    <div className="flex gap-2">
      <button onClick={share} className={btn}>
        <Share2 className="size-4" strokeWidth={1.75} /> Share
      </button>
      <button
        onClick={() => {
          fav.toggle(id);
          toast({ title: saved ? "Removed from saved" : "Saved to your shortlist" });
        }}
        aria-pressed={saved}
        className={btn}
      >
        <Heart className={`size-4 ${saved ? "fill-red-500 text-red-500" : ""}`} strokeWidth={1.75} />
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
