import type { Metadata } from "next";
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Play, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { videoInfo } from "@/lib/video";
import { formatPrice } from "@/lib/format";
import { ActionButton, ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";
import { InstagramIcon, YouTubeIcon } from "@/components/ui/BrandIcons";
import { createReel, deleteReel, moveReel, toggleReel, updateReel } from "./actions";
import { ReelLinkInput } from "./ReelLinkInput";

export const metadata: Metadata = { title: "Reels" };

interface ReelRow {
  id: string;
  title: string;
  url: string;
  cover: string;
  property_id: string | null;
  active: boolean;
}

type PropertyOption = { id: string; title: string; locality: string; price: number; images: string[] };

export default async function ReelsPage() {
  const { db } = await requireAdmin();
  const [{ data, error }, { data: props }] = await Promise.all([
    db.from("reels").select("*").order("sort_order").order("created_at"),
    db.from("properties").select("id, title, locality, price, images").neq("status", "draft").order("created_at", { ascending: false }),
  ]);
  const rows = (data ?? []) as ReelRow[];
  const properties = (props ?? []) as PropertyOption[];
  const byId = new Map(properties.map((p) => [p.id, p]));

  return (
    <>
      <PageHeader
        title="Reels"
        text="Quick Instagram reels and YouTube Shorts, separate from a listing's video tour. They show up instantly in the floating “Reels” button on every page and in the reels row on the homepage. Reels added inside a property are included after these."
      />

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Couldn&apos;t load reels: {error.message}. Has migration 0005_reels.sql been run?</p>}

      <Card title="Add a reel" text="Paste the link from Instagram (Share → Copy link) or a YouTube Short. No upload, no storage used." className="mb-6">
        <ActionForm action={createReel} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
          <ReelFields properties={properties} />
          <div className="sm:col-span-2">
            <SubmitButton>
              <Play className="size-4" /> Add reel
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {!rows.length ? (
        <Empty title="No reels yet" text="Add a site-visit or walkthrough reel — visitors can watch it from any page without leaving the website." />
      ) : (
        <>
          <p className="mb-3 text-xs text-ink-soft">
            {rows.length} reel{rows.length > 1 ? "s" : ""} · {rows.filter((r) => r.active).length} visible · top of the list plays first
          </p>
          <div className="grid gap-3">
            {rows.map((r, i) => {
              const info = videoInfo(r.url);
              const p = r.property_id ? byId.get(r.property_id) : undefined;
              const cover = r.cover || p?.images[0] || info?.thumb;
              return (
                <details key={r.id} className="group rounded-2xl border border-line bg-surface">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3 sm:p-4">
                    <span className="relative grid h-16 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-deep text-white">
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
                      )}
                      {info?.provider === "youtube" ? <YouTubeIcon className="relative size-4" /> : <InstagramIcon className="relative size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
                        <span className="truncate">{r.title}</span>
                        {!r.active && <Badge tone="amber">Hidden</Badge>}
                        {!info && <Badge tone="red">Link not recognised</Badge>}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-soft">{p ? `${p.title} · ${formatPrice(p.price)} · ${p.locality}` : "Not linked to a property"}</p>
                    </div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" title="Open" aria-label={`Open ${r.title}`} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-subtle hover:text-accent">
                      <ExternalLink className="size-4" />
                    </a>
                  </summary>
                  <div className="border-t border-line p-4">
                    <ActionForm action={updateReel} className="grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="id" value={r.id} />
                      <ReelFields row={r} properties={properties} />
                      <div className="sm:col-span-2">
                        <SubmitButton>Save</SubmitButton>
                      </div>
                    </ActionForm>
                    <div className="mt-4 flex flex-wrap gap-1 border-t border-line pt-3">
                      <ActionButton action={moveReel} fields={{ id: r.id, dir: "up" }} title="Move up">
                        <ArrowUp className={`size-4 ${i === 0 ? "opacity-30" : ""}`} /> Up
                      </ActionButton>
                      <ActionButton action={moveReel} fields={{ id: r.id, dir: "down" }} title="Move down">
                        <ArrowDown className={`size-4 ${i === rows.length - 1 ? "opacity-30" : ""}`} /> Down
                      </ActionButton>
                      <ActionButton action={toggleReel} fields={{ id: r.id, active: String(!r.active) }}>
                        {r.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {r.active ? "Hide" : "Show"}
                      </ActionButton>
                      <span className="flex-1" />
                      <ActionButton action={deleteReel} fields={{ id: r.id }} variant="danger" confirm={`Delete “${r.title}”?`}>
                        <Trash2 className="size-4" /> Delete
                      </ActionButton>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function ReelFields({ row, properties }: { row?: ReelRow; properties: PropertyOption[] }) {
  return (
    <>
      <Field label="Reel link" name="url" className="sm:col-span-2">
        <ReelLinkInput defaultValue={row?.url} />
      </Field>
      <Field label="Title" name="title" hint="Shown under the video, e.g. “Site visit — 200 sq.yd plot, Kalyanpur”.">
        <input name="title" defaultValue={row?.title} placeholder="e.g. 3 BHK villa walkthrough" className="field-sm" />
      </Field>
      <Field label="Link to a property (optional)" name="property_id" hint="Adds a “View property” button with price and area.">
        <select name="property_id" defaultValue={row?.property_id ?? ""} className="field-sm">
          <option value="">— None —</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} · {p.locality}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Cover image link (optional)" name="cover" className="sm:col-span-2" hint="Instagram doesn't share previews, so by default the linked property's photo is used as the poster.">
        <input name="cover" type="url" inputMode="url" defaultValue={row?.cover} placeholder="https://…" className="field-sm" />
      </Field>
    </>
  );
}
