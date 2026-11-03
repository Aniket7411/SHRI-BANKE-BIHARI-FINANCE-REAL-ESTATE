"use client";

import { useState } from "react";
import { Field } from "@/components/admin/forms";
import { Card } from "@/components/admin/ui";
import { CATEGORIES, DETAIL_SECTIONS, PROPERTY_TYPES, applies, isPlot, type Ctx, type DetailField } from "@/lib/property-meta";
import type { City } from "@/lib/cities";
import type { Property, PropertyCategory, Purpose } from "@/lib/types";
import { AreaInput } from "./AreaInput";
import { PriceInput } from "./PriceInput";

/**
 * Basics + every optional attribute. Category, type and purpose decide which
 * fields show (no floor number for a plot, rental terms only for rentals…).
 * Detail inputs are named `d.<key>` and parsed in actions.ts.
 */
export function PropertyFields({ property: p, cities }: { property?: Property; cities: City[] }) {
  const [category, setCategory] = useState<PropertyCategory>(p?.category ?? "Residential");
  const [type, setType] = useState(p?.type ?? "Flat");
  const [purpose, setPurpose] = useState<Purpose>(p?.purpose ?? "Buy");
  const [city, setCity] = useState(p?.city ?? cities[0]?.name ?? "Kanpur");
  const localities = cities.find((c) => c.name === city)?.localities ?? [];
  const ctx: Ctx = { category, type, purpose };
  const plot = isPlot(type);
  const d = p?.details ?? {};

  const changeCategory = (c: PropertyCategory) => {
    setCategory(c);
    if (!PROPERTY_TYPES[c].includes(type)) setType(PROPERTY_TYPES[c][0]);
  };

  return (
    <>
      <Card title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" name="title" className="sm:col-span-2">
            <input name="title" defaultValue={p?.title} placeholder="e.g. Sunlit 3 BHK Residence" className="field-sm" />
          </Field>

          <div className="sm:col-span-2">
            <span className="mb-1 block text-[13px] font-medium text-ink">Category</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <label key={c.value} className={`cursor-pointer rounded-xl border p-3 transition ${category === c.value ? "border-accent bg-accent-soft" : "border-line hover:bg-subtle"}`}>
                  <input type="radio" name="category" value={c.value} checked={category === c.value} onChange={() => changeCategory(c.value)} className="sr-only" />
                  <span className="block text-sm font-semibold text-ink">{c.value}</span>
                  <span className="block text-xs text-ink-soft">{c.hint}</span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Property type" name="type">
            <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="field-sm">
              {PROPERTY_TYPES[category].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Listing for" name="purpose">
            <select name="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)} className="field-sm">
              <option value="Buy">Sale</option>
              <option value="Rent">Rent</option>
            </select>
          </Field>
          <Field label="City" name="city" hint={city === "__new" ? "Saved to Admin → Cities, and shown to visitors in the city picker." : undefined}>
            <select name="city" value={city} onChange={(e) => setCity(e.target.value)} className="field-sm">
              {cities.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
              <option value="__new">+ Add a new city…</option>
            </select>
            {city === "__new" && <input name="new_city" autoFocus placeholder="e.g. Unnao" className="field-sm mt-2" />}
          </Field>
          <Field label="Locality" name="locality">
            <input name="locality" defaultValue={p?.locality} list="localities" placeholder={localities[0] ? `e.g. ${localities[0]}` : "e.g. Civil Lines"} className="field-sm" />
            <datalist id="localities">
              {localities.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Field>
          <Field label={purpose === "Rent" ? "Monthly rent (₹)" : "Price (₹)"} name="price">
            <PriceInput name="price" defaultValue={p?.price} />
          </Field>
          <Field label={plot ? "Plot area" : "Built-up / super area"} name="area" hint="Enter in any unit — it converts automatically.">
            <AreaInput name="area" unitName="d.areaUnit" defaultSqft={p?.area} defaultUnit={d.areaUnit} />
          </Field>
          {!plot && (
            <div className="grid grid-cols-2 gap-4">
              {category !== "Commercial" ? (
                <Field label="Bedrooms (BHK)" name="beds">
                  <input name="beds" type="number" inputMode="numeric" min={0} defaultValue={p?.beds} className="field-sm" />
                </Field>
              ) : (
                <span />
              )}
              <Field label="Washrooms" name="baths">
                <input name="baths" type="number" inputMode="numeric" min={0} defaultValue={p?.baths} className="field-sm" />
              </Field>
            </div>
          )}
          <Field label="Description" name="description" className="sm:col-span-2">
            <textarea name="description" defaultValue={p?.description} rows={5} className="field-sm resize-y" placeholder="Highlights, nearby landmarks, condition, floor…" />
          </Field>
          {!p && (
            <Field label="Web address (optional)" name="slug" className="sm:col-span-2" hint="Leave blank to create one from the title. It can't be changed later.">
              <div className="flex items-center gap-1 text-sm text-ink-soft">
                /properties/
                <input name="slug" placeholder="swaroop-nagar-3bhk" className="field-sm" />
              </div>
            </Field>
          )}
        </div>
      </Card>

      <Card title="Property details" text="All optional — fill what you know. Only fields that suit this property type are shown.">
        <div className="grid gap-6">
          {DETAIL_SECTIONS.map((s) => {
            const fields = s.fields.filter((f) => applies(f, ctx));
            if (!fields.length) return null;
            return (
              <fieldset key={s.title}>
                <legend className="mb-2 text-xs font-semibold tracking-wider text-ink-soft uppercase">{s.title}</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map((f) => (
                    <DetailInput key={f.key} f={f} value={d[f.key]} />
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function DetailInput({ f, value }: { f: DetailField; value: unknown }) {
  const name = `d.${f.key}`;
  switch (f.kind) {
    case "select":
      return (
        <Field label={f.label} name={name}>
          <select name={name} defaultValue={(value as string) ?? ""} className="field-sm">
            <option value="">—</option>
            {f.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
      );
    case "flag":
      return (
        <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-[10px] border border-line px-3 py-2.5 text-sm text-ink has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input type="checkbox" name={name} defaultChecked={Boolean(value)} className="accent-[var(--accent)]" />
          {f.label}
        </label>
      );
    case "multi": {
      const picked = (value as string[]) ?? [];
      return (
        <div className="sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-[13px] font-medium text-ink">{f.label}</span>
          <div className="flex flex-wrap gap-2">
            {f.options.map((o) => (
              <label key={o} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent-strong">
                <input type="checkbox" name={name} value={o} defaultChecked={picked.includes(o)} className="sr-only" />
                {o}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "area":
      return (
        <Field label={f.label} name={name}>
          <AreaInput name={name} defaultSqft={value as number | undefined} />
        </Field>
      );
    case "money":
      return (
        <Field label={`${f.label} (₹)`} name={name}>
          <PriceInput name={name} defaultValue={value as number | undefined} />
        </Field>
      );
    case "number":
      return (
        <Field label={f.suffix ? `${f.label} (${f.suffix})` : f.label} name={name}>
          <input name={name} type="number" inputMode="numeric" min={0} defaultValue={value as number | undefined} placeholder={f.placeholder} className="field-sm" />
        </Field>
      );
    case "date":
      return (
        <Field label={f.label} name={name}>
          <input name={name} type="date" defaultValue={(value as string) ?? ""} className="field-sm" />
        </Field>
      );
    default:
      return (
        <Field label={f.label} name={name}>
          <input name={name} defaultValue={(value as string) ?? ""} placeholder={f.placeholder} maxLength={120} className="field-sm" />
        </Field>
      );
  }
}
