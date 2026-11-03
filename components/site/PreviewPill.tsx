import { Eye, X } from "lucide-react";
import { isSitePreview } from "@/lib/api";

/** Floating pill shown while an admin previews the live site (Draft Mode). */
export async function PreviewPill() {
  if (!(await isSitePreview())) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 lg:bottom-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-deep/95 py-1.5 pr-1.5 pl-4 text-sm text-deep-fg shadow-soft backdrop-blur">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-accent" />
        </span>
        <span className="flex items-center gap-1.5">
          <Eye className="size-4 opacity-70" strokeWidth={1.75} />
          <span className="hidden sm:inline">Previewing live data</span>
          <span className="sm:hidden">Live preview</span>
        </span>
        {/* plain <a>: prefetching this route would end the preview */}
        <a href="/api/exit-preview" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-accent hover:text-accent-fg">
          <X className="size-3.5" /> Exit preview
        </a>
      </div>
    </div>
  );
}
