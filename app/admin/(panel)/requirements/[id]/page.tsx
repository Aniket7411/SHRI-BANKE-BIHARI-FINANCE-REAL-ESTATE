import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BellRing, Building2, Contact, ExternalLink, History, MessageSquareText, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { fmtDate, timeAgo } from "@/lib/admin/meta";
import { initials, telHref, waHref } from "@/lib/admin/crm-meta";
import { groupAlerts, livePropertiesForMatching, type AlertLog } from "@/lib/admin/requirements";
import { formatPrice } from "@/lib/format";
import { bedsLabel, budgetLabel, matchesRequirement, requirementRef, requirementStatus, type RequirementRow } from "@/lib/requirements";
import { alertWhatsAppText } from "@/lib/requirements-server";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { ContactButtons } from "@/components/admin/crm/LeadControls";
import { AlertsSwitch, RequirementStatusSelect, SingleAlertActions } from "@/components/admin/requirements/AlertControls";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { deleteRequirement } from "../actions";

export const metadata: Metadata = { title: "Requirement" };

export default async function RequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const { staff, db } = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const isAdmin = staff.role === "admin";

  const [{ data }, { data: logs }, properties] = await Promise.all([
    db.from("requirements").select("*").eq("id", id).maybeSingle(),
    db.from("requirement_alerts").select("requirement_id, property_id, channel, created_at").eq("requirement_id", id).order("created_at", { ascending: false }),
    livePropertiesForMatching(db),
  ]);
  const r = data as RequirementRow | null;
  if (!r) notFound();

  const alertLogs = (logs ?? []) as AlertLog[];
  const sent = groupAlerts(alertLogs, (l) => l.property_id);
  const matches = properties.filter((p) => matchesRequirement(p, r));
  // Not-yet-sent listings first, newest first within each group.
  matches.sort((a, b) => Number(sent.has(a.id)) - Number(sent.has(b.id)) || b.created_at.localeCompare(a.created_at));
  const historyIds = [...new Set(alertLogs.map((l) => l.property_id))];
  const { data: historyProps } = historyIds.length ? await db.from("properties").select("id, title, locality").in("id", historyIds) : { data: [] };
  const titleOf = new Map((historyProps ?? []).map((p) => [p.id as string, `${p.title}, ${p.locality}`]));

  const st = requirementStatus(r.status);
  const emailBlock = !r.alerts ? "Alerts are off for this customer" : !r.email ? "No email address — use WhatsApp" : r.status === "closed" ? "Requirement is closed" : undefined;

  return (
    <div className="pb-10">
      <PageHeader
        title={r.name}
        back={{ href: "/admin/requirements", label: "Requirements" }}
        actions={
          isAdmin ? (
            <ActionButton action={deleteRequirement} fields={{ id: r.id }} variant="danger" confirm={`Delete requirement ${requirementRef(r.ref)}? The lead stays in the CRM.`}>
              <Trash2 className="size-4" /> Delete
            </ActionButton>
          ) : undefined
        }
      />
      <div className="-mt-4 mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <span className="font-medium text-ink">{requirementRef(r.ref)}</span>
        <Badge tone={st.tone}>{st.label}</Badge>
        <span>·</span>
        <span>
          {r.source} · asked {timeAgo(r.created_at)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <aside className="grid content-start gap-6 lg:order-2">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-fg">{initials(r.name)}</span>
              <div className="min-w-0">
                <a href={telHref(r.phone)} className="block truncate text-lg font-semibold text-ink hover:text-accent">
                  {r.phone}
                </a>
                {r.email ? (
                  <a href={`mailto:${r.email}`} className="block truncate text-sm text-ink-soft hover:text-accent">
                    {r.email}
                  </a>
                ) : (
                  <span className="block text-sm text-ink-soft">No email</span>
                )}
              </div>
            </div>
            <div className="mt-4">
              <ContactButtons phone={r.phone} name={r.name} email={r.email} />
            </div>
            <div className="mt-4 grid gap-2 border-t border-line pt-4">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">Status</span>
                <RequirementStatusSelect id={r.id} status={r.status} className="w-36" />
              </label>
              <AlertsSwitch id={r.id} alerts={r.alerts} />
            </div>
            {r.lead_id && (
              <Link href={`/admin/leads/${r.lead_id}`} className="mt-4 flex items-center gap-3 rounded-xl border border-line p-3 text-sm transition hover:border-accent">
                <Contact className="size-5 shrink-0 text-accent" strokeWidth={1.75} />
                <span className="flex-1">
                  <span className="block font-medium text-ink">Open lead in CRM</span>
                  <span className="block text-xs text-ink-soft">Calls, notes, follow-ups and owner</span>
                </span>
                <ExternalLink className="size-4 text-ink-soft" />
              </Link>
            )}
          </Card>

          <Card title="Looking for">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Item label="Wants to" value={r.purpose === "Rent" ? "Rent" : "Buy"} />
              <Item label="Budget" value={budgetLabel(r) || "Any"} />
              <Item label="City" value={r.city || "Any"} />
              <Item label="Bedrooms" value={bedsLabel(r.beds) || "Any"} />
              <Item label="Category" value={r.category || "Any"} />
              <Item label="Type" value={r.types.join(", ") || "Any"} />
              <Item label="Localities" value={r.localities.join(", ") || "Anywhere"} wide />
              <Item label="Saved" value={fmtDate(r.created_at, true)} />
              <Item label="Last notified" value={r.last_notified_at ? timeAgo(r.last_notified_at) : "Never"} />
            </dl>
            {r.notes && (
              <div className="mt-4 rounded-xl bg-subtle p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                  <MessageSquareText className="size-3.5" /> Their notes
                </p>
                <p className="text-sm whitespace-pre-line text-ink">{r.notes}</p>
              </div>
            )}
          </Card>
        </aside>

        <div className="grid content-start gap-6">
          <Card
            title={`Matching listings (${matches.length})`}
            text={isAdmin ? "Live properties that fit this requirement. Email or WhatsApp them — each one is logged." : "Live properties that fit. Share them on WhatsApp — it's logged on the lead."}
          >
            {!matches.length ? (
              <Empty title="No live listings match yet" text="When you publish a property that fits, it'll show up here and on the property's page." />
            ) : (
              <ul className="divide-y divide-line">
                {matches.map((p) => {
                  const s = sent.get(p.id) ?? {};
                  const isNew = !r.last_notified_at || p.created_at > r.last_notified_at;
                  return (
                    <li key={p.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                      <Link href={`/admin/properties/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-subtle">
                          {p.images[0] ? (
                            <Image src={p.images[0]} alt="" fill sizes="64px" className="object-cover" />
                          ) : (
                            <Building2 className="absolute inset-0 m-auto size-6 text-ink-soft" strokeWidth={1.5} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium text-ink">{p.title}</span>
                            {isNew && !s.email && !s.whatsapp && <Badge tone="accent">New</Badge>}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-soft">
                            {p.type} · {p.locality}
                            {p.city ? `, ${p.city}` : ""}
                          </span>
                          <span className="mt-0.5 block text-sm font-semibold text-ink">
                            {formatPrice(Number(p.price))}
                            {p.purpose === "Rent" ? "/mo" : ""}
                            {p.beds ? <span className="font-normal text-ink-soft"> · {p.beds} BHK</span> : null}
                          </span>
                        </span>
                      </Link>
                      <SingleAlertActions
                        propertyId={p.id}
                        requirementId={r.id}
                        canEmail={isAdmin}
                        blockedReason={emailBlock}
                        emailedAt={s.email}
                        whatsappAt={s.whatsapp}
                        waLink={waHref(r.phone, alertWhatsAppText(r, p))}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Alert history" text="Every listing sent to this customer.">
            {!alertLogs.length ? (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <History className="size-4" /> Nothing sent yet.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {alertLogs.map((l) => (
                  <li key={`${l.property_id}-${l.channel}`} className="flex items-start gap-3 text-sm">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full ${l.channel === "email" ? "bg-accent-soft text-accent" : "bg-wa/10 text-wa"}`}>
                      {l.channel === "email" ? <BellRing className="size-4" /> : <WhatsAppIcon className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link href={`/admin/properties/${l.property_id}`} className="block truncate font-medium text-ink hover:text-accent">
                        {titleOf.get(l.property_id) ?? l.property_id}
                      </Link>
                      <span className="block text-xs text-ink-soft">
                        {l.channel === "email" ? "Emailed" : "Sent on WhatsApp"} · {fmtDate(l.created_at, true)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}
