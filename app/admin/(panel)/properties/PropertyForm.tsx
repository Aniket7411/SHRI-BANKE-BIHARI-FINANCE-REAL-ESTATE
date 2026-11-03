import { ActionForm, ChipsInput, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { MediaManager } from "@/components/admin/MediaManager";
import { Card } from "@/components/admin/ui";
import { LISTING_STATUSES } from "@/lib/admin/meta";
import type { City } from "@/lib/cities";
import type { Property } from "@/lib/types";
import { PropertyFields } from "./PropertyFields";
import { saveProperty } from "./actions";

const COMMON_AMENITIES = ["Lift", "Power backup", "Covered parking", "Gated society", "24×7 security", "CCTV", "Gym", "Swimming pool", "Club house", "Park", "Modular kitchen", "Solar panels", "Water supply 24×7", "Vastu compliant", "Intercom", "Fire safety", "Rain water harvesting", "Visitor parking", "Children's play area", "Wheelchair access"];

const MAX_PHOTOS = 6;

type Editable = Property & { status?: string };

export function PropertyForm({ property, cities, amenities }: { property?: Editable; cities: City[]; amenities: string[] }) {
  const p = property;
  const folder = `properties/${p?.id ?? "new"}`;
  return (
    <ActionForm action={saveProperty} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {p && <input type="hidden" name="id" value={p.id} />}

      <div className="grid min-w-0 gap-6">
        <PropertyFields property={p} cities={cities} />

        <Card title="Photos" text="Up to 6 photos. Drag them in and reorder with the arrows. The first photo is shown on cards.">
          <MediaManager name="images" kind="image" folder={folder} defaultValue={p?.images} max={MAX_PHOTOS} />
        </Card>

        <Card title="Video tour" text="Optional. Paste Instagram reel or YouTube link — we embed it, nothing is uploaded.">
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
