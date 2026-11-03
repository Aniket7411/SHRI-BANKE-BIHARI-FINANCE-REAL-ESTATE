"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AreaUnit } from "@/lib/types";

const KEY = "sbb:area-unit";
const EVENT = "sbb:area-unit";

function read(): AreaUnit {
  try {
    const v = localStorage.getItem(KEY);
    return v === "sqm" || v === "sqyd" ? v : "sqft";
  } catch {
    return "sqft";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Preferred unit for showing areas (sq.ft / sq.m / sq.yd), shared by every card and page. */
export function useAreaUnit() {
  const unit = useSyncExternalStore(subscribe, read, () => "sqft" as AreaUnit);
  const setUnit = useCallback((u: AreaUnit) => {
    try {
      localStorage.setItem(KEY, u);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [unit, setUnit] as const;
}
