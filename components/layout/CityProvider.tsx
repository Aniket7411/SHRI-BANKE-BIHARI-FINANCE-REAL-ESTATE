"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { cityList, type City } from "@/lib/cities";

const KEY = "sbb:city";
const EVENT = "sbb:city";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
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

/** Remember the visitor's city on this device ("" = all cities). */
export function saveCity(name: string) {
  try {
    if (name) localStorage.setItem(KEY, name);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const Ctx = createContext<City[]>([]);

/** Active cities (Admin → Cities) for client components. */
export function CityProvider({ cities, children }: { cities: City[]; children: React.ReactNode }) {
  return <Ctx value={cities}>{children}</Ctx>;
}

/**
 * The visitor's selected city, shared by the header picker, homepage search,
 * featured carousel and browse page. Unknown / removed cities read as "all".
 */
export function useCity() {
  const cities = useContext(Ctx);
  const saved = useSyncExternalStore(subscribe, read, () => "");
  const city = cities.some((c) => c.name === saved) ? saved : "";
  const setCity = useCallback((name: string) => saveCity(name), []);
  const current = cities.find((c) => c.name === city);
  return {
    cities,
    city,
    setCity,
    /** Localities of the selected city, or of every city. */
    localities: current ? current.localities : [...new Set(cities.flatMap((c) => c.localities))],
    /** "Lucknow", or "Kanpur & Lucknow" when no city is picked. */
    label: city || cityList(cities.map((c) => c.name)),
  };
}
