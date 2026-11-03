"use client";

import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ clock */

const TICK = 30_000;

function subscribeClock(cb: () => void) {
  const t = setInterval(cb, TICK);
  return () => clearInterval(t);
}
const readClock = () => Math.floor(Date.now() / TICK) * TICK;

/**
 * Current time (rounded to 30 s) on the client, `null` during SSR / hydration.
 * Offer windows are evaluated in the browser so cached pages never show stale offers.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribeClock, readClock, () => null);
}

/* ------------------------------------------------------------------ persisted flags */

const listeners = new Set<() => void>();
/** In-memory fallback so dismissing still works when localStorage is blocked. */
const memory = new Set<string>();

function subscribeFlags(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function readFlag(key: string) {
  if (memory.has(key)) return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setFlag(key: string) {
  memory.add(key);
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* private mode / blocked storage — the in-memory flag still applies */
  }
  listeners.forEach((l) => l());
}

/** A "seen / dismissed" flag persisted per visitor. Reads `true` on the server so nothing flashes. */
export function useFlag(key: string): boolean {
  return useSyncExternalStore(
    subscribeFlags,
    () => readFlag(key),
    () => true,
  );
}
