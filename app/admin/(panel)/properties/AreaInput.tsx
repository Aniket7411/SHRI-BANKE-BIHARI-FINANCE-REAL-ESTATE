"use client";

import { useState } from "react";
import { AREA_UNITS, formatArea, fromSqft, toSqft } from "@/lib/property-meta";
import type { AreaUnit } from "@/lib/types";

/**
 * Area in any unit. Switching the unit converts the number in place, and the
 * other units are shown live underneath. Always submits sq.ft as `name`.
 */
export function AreaInput({ name, unitName, defaultSqft, defaultUnit = "sqft" }: { name: string; unitName?: string; defaultSqft?: number; defaultUnit?: AreaUnit }) {
  const [unit, setUnit] = useState<AreaUnit>(defaultUnit);
  const [v, setV] = useState(defaultSqft ? round(fromSqft(defaultSqft, defaultUnit)) : "");
  const sqft = Number(v) > 0 ? toSqft(Number(v), unit) : 0;

  const changeUnit = (next: AreaUnit) => {
    if (sqft) setV(round(fromSqft(sqft, next)));
    setUnit(next);
  };

  return (
    <div>
      <div className="flex">
        <input type="number" inputMode="decimal" min={0} step="any" value={v} onChange={(e) => setV(e.target.value)} className="field-sm rounded-r-none" />
        <select value={unit} onChange={(e) => changeUnit(e.target.value as AreaUnit)} aria-label="Area unit" className="field-sm w-auto rounded-l-none border-l-0">
          {AREA_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name={name} value={sqft ? Math.round(sqft) : ""} />
      {unitName && <input type="hidden" name={unitName} value={unit} />}
      {sqft > 0 && (
        <p className="mt-1 text-xs text-ink-soft">
          ={" "}
          {AREA_UNITS.filter((u) => u.value !== unit)
            .map((u) => formatArea(sqft, u.value))
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

const round = (n: number) => String(Math.round(n * 100) / 100);
