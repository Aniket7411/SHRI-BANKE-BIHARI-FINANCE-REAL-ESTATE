"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FlaskConical, X } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const KEY = "admin-demo-badge-hidden";
const EVENT = "demo-badge-change";

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const hiddenNow = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Slim, dismissible "DEMO" marker shown while Supabase isn't connected. */
export function DemoBadge({ compact = false }: { compact?: boolean }) {
  const hidden = useSyncExternalStore(subscribe, hiddenNow, () => false);
  if (isSupabaseConfigured || hidden) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* storage blocked — hide for this render only */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  if (compact) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 py-0.5 pr-1 pl-2 text-[10px] font-bold tracking-[0.14em] text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        OFFLINE
        <button type="button" onClick={dismiss} aria-label="Hide demo badge" className="grid size-4 place-items-center rounded-full hover:bg-amber-100 dark:hover:bg-amber-900">
          <X className="size-3" />
        </button>
      </span>
    );
  }

  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-1.5 pr-1.5 pl-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <FlaskConical className="size-3.5 shrink-0" strokeWidth={2} />
      <Link href="/admin/settings" className="min-w-0 flex-1 truncate text-[11px] leading-tight" title="Supabase not connected — data is stored in a temporary local file. See Settings.">
        <span className="font-bold tracking-[0.14em]">OFFLINE</span>
        <span className="opacity-75"> · DB not connected</span>
      </Link>
      <button type="button" onClick={dismiss} aria-label="Hide demo badge" className="grid size-6 shrink-0 place-items-center rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
