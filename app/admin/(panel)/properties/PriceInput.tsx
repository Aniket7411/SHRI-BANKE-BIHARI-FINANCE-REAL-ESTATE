"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

/** Rupee input with a live "₹85 L / ₹1.2 Cr" preview to avoid zero-count mistakes. */
export function PriceInput({ name, defaultValue }: { name: string; defaultValue?: number }) {
  const [v, setV] = useState(defaultValue ? String(defaultValue) : "");
  const n = Number(v);
  return (
    <div className="relative">
      <input name={name} type="number" inputMode="numeric" min={0} value={v} onChange={(e) => setV(e.target.value)} className="field-sm pr-24" />
      {n > 0 && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-accent">{formatPrice(n)}</span>}
    </div>
  );
}
