import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, MapPin, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { ActionButton, ActionForm, ChipsInput, Field, SubmitButton } from "@/components/admin/forms";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";
import { createCity, deleteCity, moveCity, toggleCity, updateCity } from "./actions";

export const metadata: Metadata = { title: "Cities" };

interface CityRow {
  id: string;
  name: string;
  localities: string[];
  active: boolean;
}

export default async function CitiesPage() {
  const { db } = await requireAdmin();
  const [{ data, error }, { data: listings }] = await Promise.all([
    db.from("cities").select("*").order("sort_order").order("name"),
    db.from("properties").select("city"),
  ]);
  const rows = (data ?? []) as CityRow[];
  const count = (name: string) => (listings ?? []).filter((p) => (p.city || "Kanpur") === name).length;

  return (
    <>
      <PageHeader
        title="Cities"
        text="Cities you sell and rent in. Visitors pick one from the header and the website shows that city's listings. The picker appears once there are two or more visible cities."
      />

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Couldn&apos;t load cities: {error.message}. Has migration 0006_cities.sql been run?</p>}

      <Card title="Add a city" text="You can also add one straight from the property form (City → “+ Add a new city…”)." className="mb-6">
        <ActionForm action={createCity} resetOnSuccess className="grid gap-4 sm:grid-cols-[240px_1fr_auto] sm:items-start">
          <Field label="City" name="name">
            <input name="name" placeholder="e.g. Unnao" className="field-sm" />
          </Field>
          <Field label="Localities (optional)" name="localities" hint="Type a locality and press Enter (or comma). Suggested in the property form and shown in the website's locality filter.">
            <ChipsInput name="localities" placeholder="e.g. Civil Lines — press Enter" />
          </Field>
          <SubmitButton className="sm:mt-[22px]">Add city</SubmitButton>
        </ActionForm>
      </Card>

      {!rows.length ? (
        <Empty title="No cities yet" text="Add Kanpur first, then any city you expand to." />
      ) : (
        <div className="grid gap-3">
          {rows.map((r, i) => {
            const n = count(r.name);
            return (
              <details key={r.id} className="group rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-strong">
                    <MapPin className="size-5" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
                      {r.name}
                      {!r.active && <Badge tone="amber">Hidden</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      <Link href={`/admin/properties?city=${encodeURIComponent(r.name)}`} className="hover:text-accent hover:underline">
                        {n} listing{n === 1 ? "" : "s"}
                      </Link>{" "}
                      · {r.localities.length} localit{r.localities.length === 1 ? "y" : "ies"}
                    </p>
                  </div>
                </summary>
                <div className="border-t border-line p-4">
                  <ActionForm action={updateCity} className="grid gap-4 sm:grid-cols-[240px_1fr_auto] sm:items-start">
                    <input type="hidden" name="id" value={r.id} />
                    <Field label="City" name="name" hint={n ? "Renaming moves its listings too." : undefined}>
                      <input name="name" defaultValue={r.name} className="field-sm" />
                    </Field>
                    <Field label="Localities" name="localities" hint="Press Enter after each one. Click × to remove.">
                      <ChipsInput name="localities" defaultValue={r.localities} placeholder="Add a locality — press Enter" />
                    </Field>
                    <SubmitButton className="sm:mt-[22px]">Save</SubmitButton>
                  </ActionForm>
                  <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
                    <ActionButton action={moveCity} fields={{ id: r.id, dir: "up" }} title="Move up">
                      <ArrowUp className={`size-4 ${i === 0 ? "opacity-30" : ""}`} /> Up
                    </ActionButton>
                    <ActionButton action={moveCity} fields={{ id: r.id, dir: "down" }} title="Move down">
                      <ArrowDown className={`size-4 ${i === rows.length - 1 ? "opacity-30" : ""}`} /> Down
                    </ActionButton>
                    <ActionButton action={toggleCity} fields={{ id: r.id, active: String(!r.active) }}>
                      {r.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {r.active ? "Hide" : "Show"}
                    </ActionButton>
                    <span className="flex-1" />
                    <ActionButton action={deleteCity} fields={{ id: r.id }} variant="danger" confirm={`Delete ${r.name}?`}>
                      <Trash2 className="size-4" /> Delete
                    </ActionButton>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
