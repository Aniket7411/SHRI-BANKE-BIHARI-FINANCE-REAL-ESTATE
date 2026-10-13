import { ActionForm, ChipsInput, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { MediaManager } from "@/components/admin/MediaManager";
import { Card } from "@/components/admin/ui";
import { LISTING_STATUSES } from "@/lib/admin/meta";
import type { Property } from "@/lib/types";
import { PriceInput } from "./PriceInput";
import { saveProperty } from "./actions";

const TYPES = ["Apartment", "Villa", "House", "Plot", "Commercial"] as const;
const COMMON_AMENITIES = ["Lift", "Power backup", "Covered parking", "Gated society", "24×7 security", "CCTV", "Gym", "Swimming pool", "Club house", "Park", "Modular kitchen", "Solar panels", "Water supply 24×7", "Vastu compliant"];

type Editable = Property & { status?: string };

export function PropertyForm({ property, localities, amenities }: { property?: Editable; localities: string[]; amenities: string[] }) {
  const p = property;
  const folder = `properties/${p?.id ?? "new"}`;
  return (
    <ActionForm action={saveProperty} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {p && <input type="hidden" name="id" value={p.id} />}

      <div className="grid min-w-0 gap-6">
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" name="title" className="sm:col-span-2">
              <input name="title" defaultValue={p?.title} placeholder="e.g. Sunlit 3 BHK Residence" className="field-sm" />
            </Field>
            <Field label="Property type" name="type">
              <select name="type" defaultValue={p?.type ?? "Apartment"} className="field-sm">
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Listing for" name="purpose">
              <select name="purpose" defaultValue={p?.purpose ?? "Buy"} className="field-sm">
                <option value="Buy">Sale</option>
                <option value="Rent">Rent</option>
              </select>
            </Field>
            <Field label="Locality" name="locality">
              <input name="locality" defaultValue={p?.locality} list="localities" placeholder="e.g. Swaroop Nagar" className="field-sm" />
              <datalist id="localities">
                {localities.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </Field>
            <Field label="Price (₹)" name="price" hint="Total price for sale, monthly rent for rentals.">
              <PriceInput name="price" defaultValue={p?.price} />
            </Field>
            <Field label="Built-up area (sq.ft)" name="area">
              <input name="area" type="number" inputMode="numeric" min={1} defaultValue={p?.area} className="field-sm" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bedrooms" name="beds">
                <input name="beds" type="number" inputMode="numeric" min={0} defaultValue={p?.beds} className="field-sm" />
              </Field>
              <Field label="Bathrooms" name="baths">
                <input name="baths" type="number" inputMode="numeric" min={0} defaultValue={p?.baths} className="field-sm" />
              </Field>
            </div>
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

        <Card title="Photos" text="Drag photos in, reorder with the arrows. The first photo is shown on cards.">
          <MediaManager name="images" kind="image" folder={folder} defaultValue={p?.images} />
        </Card>

        <Card title="Video tour" text="Optional. Upload a short clip or paste a YouTube link.">
          <MediaManager name="videos" kind="video" folder={folder} defaultValue={p?.videos} max={5} />
        </Card>

        <Card title="Amenities & tags">
          <div className="grid gap-4">
            <Field label="Amenities">
              <ChipsInput name="amenities" defaultValue={p?.amenities} suggestions={[...new Set([...COMMON_AMENITIES, ...amenities])]} />
            </Field>
            <Field label="Highlight tags" hint="Short labels shown on the listing, e.g. Ready to move, Corner unit.">
              <ChipsInput name="tags" defaultValue={p?.tags} suggestions={["Ready to move", "New launch", "Corner unit", "Park facing", "Premium", "Price reduced"]} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="grid content-start gap-6 lg:sticky lg:top-6">
        <Card title="Publish">
          <div className="grid gap-3">
            <Field label="Status" name="status">
              <select name="status" defaultValue={p?.status ?? "published"} className="field-sm">
                {LISTING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Toggle name="featured" defaultChecked={p?.featured} label="Featured" hint="Show on the homepage" />
            <Toggle name="verified" defaultChecked={p?.verified ?? true} label="Verified" hint="Shows the verified badge" />
            <SubmitButton className="mt-1 h-10 w-full">{p ? "Save changes" : "Create property"}</SubmitButton>
          </div>
        </Card>
      </div>
    </ActionForm>
  );
}
