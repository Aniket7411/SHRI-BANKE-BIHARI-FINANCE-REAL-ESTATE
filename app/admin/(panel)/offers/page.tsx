import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, BadgePercent, CalendarClock, Copy, Eye, EyeOff, Megaphone, MessageSquareDashed, Plus, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { offerStatus, offerTheme, OFFER_THEMES, type OfferStatus } from "@/lib/offers";
import { ActionButton, ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { Badge, Empty, PageHeader, type Tone } from "@/components/admin/ui";
import { deleteOffer, duplicateOffer, moveOffer, saveOffer, toggleOffer } from "./actions";
import { formatIst, toIstInput } from "./time";

export const metadata: Metadata = { title: "Offers & coupons" };

interface OfferRow {
  id: string;
  title: string;
  description: string;
  code: string | null;
  discount_text: string;
  applies_to: string;
  starts_at: string | null;
  ends_at: string | null;
  show_banner: boolean;
  show_popup: boolean;
  cta_label: string;
  cta_href: string;
  theme: string;
  active: boolean;
}

const STATUS: Record<OfferStatus | "hidden", { label: string; tone: Tone }> = {
  live: { label: "Live", tone: "green" },
  scheduled: { label: "Scheduled", tone: "blue" },
  expired: { label: "Expired", tone: "neutral" },
  hidden: { label: "Hidden", tone: "amber" },
};

const FILTERS = [
  ["all", "All"],
  ["live", "Live"],
  ["scheduled", "Scheduled"],
  ["expired", "Expired"],
] as const;

const APPLIES_TO = ["All", "Home loan", "Vehicle loan", "Loan against property", "Balance transfer", "Business loan", "All properties", "New launches"];

/** Request time for status badges (this page is always rendered per request, after auth). */
const requestTime = () => Date.now();

export default async function OffersPage({ searchParams }: PageProps<"/admin/offers">) {
  const { db } = await requireAdmin();
  const filter = String((await searchParams).filter ?? "all");
  const { data, error } = await db.from("offers").select("*").order("sort_order").order("created_at", { ascending: false });
  const rows = (data ?? []) as OfferRow[];
  const now = requestTime();
  const withStatus = rows.map((r) => ({ ...r, status: offerStatus({ startsAt: r.starts_at, endsAt: r.ends_at }, now) }));
  const counts = { all: rows.length, live: 0, scheduled: 0, expired: 0 } as Record<string, number>;
  for (const r of withStatus) counts[r.status]++;
  const shown = filter === "all" ? withStatus : withStatus.filter((r) => r.status === filter);
  const liveBanner = withStatus.find((r) => r.active && r.status === "live" && r.show_banner);

  return (
    <>
      <PageHeader
        title="Offers & coupons"
        text="Festive deals shown as a top banner, a one-time popup and an offers strip on the homepage and Loans page. Offers appear and disappear automatically by their dates."
      />

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Couldn&apos;t load offers: {error.message}. Has migration 0003_cms.sql been run?</p>}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex overflow-x-auto px-1">
          <div className="inline-flex shrink-0 rounded-full border border-line bg-surface p-1 text-sm">
            {FILTERS.map(([k, label]) => (
              <Link key={k} href={k === "all" ? "/admin/offers" : `/admin/offers?filter=${k}`} className={`rounded-full px-3.5 py-1.5 whitespace-nowrap ${filter === k ? "bg-ink text-bg" : "text-ink-soft hover:text-ink"}`}>
                {label}
                <span className="ml-1.5 text-[11px] opacity-70">{counts[k] ?? 0}</span>
              </Link>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Megaphone className="size-3.5" />
          {liveBanner ? (
            <>
              Top banner now: <strong className="text-ink">{liveBanner.title}</strong>
            </>
          ) : (
            "No banner is showing right now"
          )}
        </p>
      </div>

      <div className="grid gap-3">
        {!shown.length && rows.length > 0 && <Empty title={`No ${filter} offers`} text="Try another filter." />}
        {shown.map((r) => {
          const st = r.active ? STATUS[r.status] : STATUS.hidden;
          const t = offerTheme(r.theme);
          const idx = rows.findIndex((x) => x.id === r.id);
          return (
            <details key={r.id} className="group rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-start gap-3 p-4 sm:items-center">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${t.card}`}>
                  <BadgePercent className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
                    <span className="truncate">{r.title}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {r.active && r.status !== "live" && <Badge>{r.status === "scheduled" ? "Not started" : "Ended"}</Badge>}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-ink-soft">
                    {r.discount_text}
                    {r.applies_to && ` · ${r.applies_to}`}
                    {r.code && (
                      <>
                        {" · "}
                        <span className="font-mono text-xs font-semibold text-ink">{r.code}</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3.5" />
                      {formatIst(r.starts_at) ?? "Now"} → {formatIst(r.ends_at) ?? "No end date"}
                    </span>
                    {r.show_banner && (
                      <span className="inline-flex items-center gap-1">
                        <Megaphone className="size-3.5" /> Banner
                      </span>
                    )}
                    {r.show_popup && (
                      <span className="inline-flex items-center gap-1">
                        <MessageSquareDashed className="size-3.5" /> Popup
                      </span>
                    )}
                  </p>
                </div>
                <span className="hidden text-xs text-ink-soft group-open:hidden sm:inline">Edit</span>
              </summary>
              <div className="border-t border-line p-4">
                <OfferForm row={r} />
                <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
                  <ActionButton action={moveOffer} fields={{ id: r.id, dir: "up" }} title="Move up">
                    <ArrowUp className={`size-4 ${idx === 0 ? "opacity-30" : ""}`} />
                  </ActionButton>
                  <ActionButton action={moveOffer} fields={{ id: r.id, dir: "down" }} title="Move down">
                    <ArrowDown className={`size-4 ${idx === rows.length - 1 ? "opacity-30" : ""}`} />
                  </ActionButton>
                  <ActionButton action={toggleOffer} fields={{ id: r.id, active: String(!r.active) }}>
                    {r.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {r.active ? "Hide" : "Show"}
                  </ActionButton>
                  <ActionButton action={duplicateOffer} fields={{ id: r.id }}>
                    <Copy className="size-4" /> Duplicate
                  </ActionButton>
                  <span className="flex-1" />
                  <ActionButton action={deleteOffer} fields={{ id: r.id }} variant="danger" confirm={`Delete “${r.title}”? This can't be undone.`}>
                    <Trash2 className="size-4" /> Delete
                  </ActionButton>
                </div>
              </div>
            </details>
          );
        })}

        <details className="rounded-2xl border border-dashed border-line bg-surface" open={!rows.length}>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium text-ink">
            <Plus className="size-4" /> Create an offer
          </summary>
          <div className="border-t border-line p-4">
            <OfferForm />
          </div>
        </details>
      </div>
    </>
  );
}

function OfferForm({ row }: { row?: OfferRow }) {
  const listId = `applies-${row?.id ?? "new"}`;
  return (
    <ActionForm action={saveOffer} resetOnSuccess={!row} className="grid gap-4 sm:grid-cols-2">
      {row && <input type="hidden" name="id" value={row.id} />}
      <Field label="Title" name="title" className="sm:col-span-2">
        <input name="title" defaultValue={row?.title} placeholder="e.g. Diwali Dhamaka on Home Loans" className="field-sm" />
      </Field>
      <Field label="Headline benefit" name="discount_text" hint="Shown big on the banner and cards.">
        <input name="discount_text" defaultValue={row?.discount_text} placeholder="e.g. Zero processing fee" className="field-sm" />
      </Field>
      <Field label="Applies to" name="applies_to">
        <input name="applies_to" list={listId} defaultValue={row?.applies_to ?? "All"} className="field-sm" />
        <datalist id={listId}>
          {APPLIES_TO.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </Field>
      <Field label="Description" name="description" className="sm:col-span-2">
        <textarea name="description" defaultValue={row?.description} rows={3} className="field-sm resize-y" placeholder="Terms in one or two lines, e.g. valid on sanctions before 15 Nov." />
      </Field>
      <Field label="Coupon code (optional)" name="code" hint="Visitors can copy it with one tap.">
        <input name="code" defaultValue={row?.code ?? ""} placeholder="DIWALI26" className="field-sm font-mono uppercase" autoCapitalize="characters" />
      </Field>
      <Field label="Look" name="theme">
        <select name="theme" defaultValue={row?.theme ?? "diwali"} className="field-sm">
          {Object.entries(OFFER_THEMES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Starts (IST)" name="starts_at" hint="Leave empty to start right away.">
        <input type="datetime-local" name="starts_at" defaultValue={toIstInput(row?.starts_at)} className="field-sm" />
      </Field>
      <Field label="Ends (IST)" name="ends_at" hint="Leave empty to run until you hide it.">
        <input type="datetime-local" name="ends_at" defaultValue={toIstInput(row?.ends_at)} className="field-sm" />
      </Field>
      <Field label="Button label" name="cta_label">
        <input name="cta_label" defaultValue={row?.cta_label ?? "Claim offer"} className="field-sm" />
      </Field>
      <Field label="Button link" name="cta_href" hint="A page like /loans#apply or a full link.">
        <input name="cta_href" defaultValue={row?.cta_href ?? "/loans#apply"} className="field-sm" />
      </Field>
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
        <Toggle name="show_banner" defaultChecked={row?.show_banner ?? true} label="Top banner" hint="Slim bar above the header" />
        <Toggle name="show_popup" defaultChecked={row?.show_popup ?? false} label="Popup" hint="Once per visitor" />
        <Toggle name="active" defaultChecked={row?.active ?? true} label="Active" hint="Off = hidden everywhere" />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton>{row ? "Save offer" : "Create offer"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
