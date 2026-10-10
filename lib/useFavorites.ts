"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "sbb:favorites";
const EVENT = "sbb:favorites";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
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

/** Saved / shortlisted properties, persisted per device. */
export function useFavorites() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const ids: string[] = JSON.parse(raw);

  const toggle = useCallback((id: string) => {
    const cur: string[] = JSON.parse(read());
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { ids, has: (id: string) => ids.includes(id), toggle };
}
