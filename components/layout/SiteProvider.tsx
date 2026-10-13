"use client";

import { createContext, useContext } from "react";
import { defaultSettings, type SiteSettings } from "@/lib/site";

const Ctx = createContext<SiteSettings>(defaultSettings);

/** Live business settings (phone, WhatsApp, rates…) for client components. */
export function SiteProvider({ value, children }: { value: SiteSettings; children: React.ReactNode }) {
  return <Ctx value={value}>{children}</Ctx>;
}

export const useSite = () => useContext(Ctx);
