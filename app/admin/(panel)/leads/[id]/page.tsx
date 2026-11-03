import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BellOff, BellRing, Building2, CalendarClock, ExternalLink, Megaphone, MessageSquareText, PhoneCall, Star, UserRound } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { fmtDate, leadStatus, timeAgo } from "@/lib/admin/meta";
import { callOutcome, fmtFollowUp, initials, telHref, toIstInput } from "@/lib/admin/crm-meta";
import { staffMap, staffName, type LeadRow, type StaffLite } from "@/lib/admin/leads-query";
import { formatPrice } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { AssignSelect, ContactButtons, StatusSelect } from "@/components/admin/crm/LeadControls";
import { CallLogForm, FollowUpForm, NoteForm } from "@/components/admin/crm/CallLog";
import { Timeline, type TimelineEntry } from "@/components/admin/crm/Timeline";
import { ReviewRequest } from "@/components/admin/crm/ReviewRequest";
import { isOpen, reviewUrl, type ReviewRequest as ReviewRequestRow } from "@/lib/reviews";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { requirementRef, requirementStatus, requirementSummary, type RequirementRow } from "@/lib/requirements";

export const metadata: Metadata = { title: "Lead" };

interface Activity {
  id: number;
  kind: string;
  body: string | null;
  data: Record<string, unknown> | null;
  actor: string | null;
  created_at: string;
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { staff, db } = await requireStaff();
  const { id } = await params;
  const isAdmin = staff.role === "admin";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let q = db.from("leads").select("*").eq("id", id);
  if (!isAdmin) q = q.eq("assigned_to", staff.id);
  const [{ data: leadData }, { data: acts }, { data: profiles }] = await Promise.all([
    q.maybeSingle(),
    db.from("lead_activities").select("id, kind, body, data, actor, created_at").eq("lead_id", id).order("created_at", { ascending: false }).limit(200),
    db.from("profiles").select("id, full_name, email, role, active"),
  ]);
  const lead = leadData as LeadRow | null;
  if (!lead) notFound();

  // Linked listing + review link for a Won deal (table from migration 0007; missing table → no card data, still works).
  const [{ data: property }, { data: reviewReq }] = await Promise.all([
    lead.property_id ? db.from("properties").select("id, title, locality, price, purpose").eq("id", lead.property_id).maybeSingle() : { data: null },
    lead.status === "won" ? db.from("review_requests").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(1).maybeSingle() : { data: null },
  ]);
  // Saved requirements (table from migration 0009; missing table → empty list).
  const { data: reqData } = await db.from("requirements").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
  const requirements = (reqData ?? []) as RequirementRow[];
  const rr = reviewReq as ReviewRequestRow | null;
  const { data: review } = rr?.testimonial_id ? await db.from("testimonials").select("rating, active").eq("id", rr.testimonial_id).maybeSingle() : { data: null };

  const people = (profiles ?? []) as StaffLite[];
  const byId = staffMap(people);
  const nameOf = (v: unknown) => (typeof v === "string" ? staffName(byId.get(v)) : "Unassigned");
  const assignable = people.filter((p) => p.active).map((p) => ({ id: p.id, name: p.full_name || p.email }));
  const st = leadStatus(lead.status);
  const owner = lead.assigned_to ? byId.get(lead.assigned_to) : undefined;
  const closed = lead.status === "won" || lead.status === "lost";
  const overdue = !closed && lead.follow_up_at && new Date(lead.follow_up_at).getTime() < new Date().getTime();

  const activities = (acts ?? []) as Activity[];
  const calls = activities.filter((a) => a.kind === "call");
  const timeline: TimelineEntry[] = activities.map((a) => describe(a, nameOf));

  const utm = lead.utm ?? {};
  const meta = (lead.meta ?? {}) as Record<string, unknown>;
  const campaign: [string, unknown][] = [
    ["Source", lead.source],
    ["Channel", lead.channel],
    ["UTM source", utm.utm_source],
    ["UTM medium", utm.utm_medium],
    ["Campaign", utm.utm_campaign ?? meta.campaign_name],
    ["Ad set", meta.adset_name],
    ["Ad", utm.utm_content ?? meta.ad_name],
    ["Keyword", utm.utm_term],
    ["Landing page", utm.landing],
    ["Click id", utm.gclid ? "Google Ads (gclid)" : utm.fbclid ? "Meta (fbclid)" : undefined],
  ];

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader title={lead.name} back={{ href: "/admin/leads", label: "Leads" }} />
      <div className="-mt-4 mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <span className="font-medium text-ink">L-{lead.ref}</span>
        <Badge tone={st.tone}>{st.label}</Badge>
        <span>·</span>
        <span>
          {lead.interest} · created {timeAgo(lead.created_at)}
        </span>
        {lead.submissions > 1 && <Badge tone="blue">{lead.submissions} enquiries</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Sidebar first on phones: contact + controls are what an executive needs first. */}
        <aside className="grid content-start gap-6 lg:order-2">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-fg">{initials(lead.name)}</span>
              <div className="min-w-0">
                <a href={telHref(lead.phone)} className="block truncate text-lg font-semibold text-ink hover:text-accent">
                  {lead.phone}
                </a>
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="block truncate text-sm text-ink-soft hover:text-accent">
                    {lead.email}
                  </a>
                )}
              </div>
            </div>
            <div className="mt-4">
              <ContactButtons phone={lead.phone} name={lead.name} email={lead.email} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
              <Item label="Interested in" value={lead.interest} />
              <Item label="Budget" value={lead.budget} />
              <Item label="Callback slot" value={lead.callback_slot} />
              <Item label="Calls logged" value={String(calls.length)} />
              <Item label="Created" value={fmtDate(lead.created_at, true)} />
              <Item label="Last activity" value={timeAgo(lead.last_activity_at)} />
            </dl>
            {lead.message && (
              <div className="mt-4 rounded-xl bg-subtle p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                  <MessageSquareText className="size-3.5" /> Their message
                </p>
                <p className="text-sm whitespace-pre-line text-ink">{lead.message}</p>
              </div>
            )}
            {lead.property_id && (
              <Link
                href={`/properties/${lead.property_id}`}
                target="_blank"
                className="mt-4 flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-accent"
              >
                <Building2 className="size-5 shrink-0 text-accent" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{property?.title ?? lead.property_id}</span>
                  {property && (
                    <span className="block text-xs text-ink-soft">
                      {property.locality} · {formatPrice(Number(property.price))}
                      {property.purpose === "Rent" ? "/mo" : ""}
                    </span>
                  )}
                </span>
                <ExternalLink className="size-4 text-ink-soft" />
              </Link>
            )}
          </Card>

          <Card title="Pipeline">
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-ink">Status</span>
                <StatusSelect id={lead.id} status={lead.status} className="w-full" />
              </label>
              <div>
                <span className="mb-1 block text-[13px] font-medium text-ink">Sales executive</span>
                {isAdmin ? (
                  <AssignSelect id={lead.id} assignedTo={lead.assigned_to} staff={assignable} className="w-full" />
                ) : (
                  <p className="flex items-center gap-2 text-sm text-ink">
                    <UserRound className="size-4 text-ink-soft" /> {staffName(owner)}
                  </p>
                )}
                {isAdmin && <p className="mt-1 text-xs text-ink-soft">They’re emailed the lead details on assignment.</p>}
              </div>
              <div>
                <span className="mb-1 flex items-center justify-between text-[13px] font-medium text-ink">
                  Next follow-up
                  {lead.follow_up_at && !closed && <Badge tone={overdue ? "red" : "amber"}>{overdue ? "Overdue" : fmtFollowUp(lead.follow_up_at)}</Badge>}
                </span>
                <FollowUpForm key={lead.follow_up_at ?? "none"} leadId={lead.id} current={toIstInput(lead.follow_up_at)} />
              </div>
            </div>
          </Card>

          {lead.status === "won" && (
            <Card title="Ask for a review" actions={<Star className="size-4 text-accent" strokeWidth={1.75} />}>
              <ReviewRequest
                leadId={lead.id}
                name={lead.name}
                phone={lead.phone}
                email={lead.email}
                initialUrl={rr && isOpen(rr) ? reviewUrl(rr.token) : null}
                received={rr?.submitted_at ? { rating: review?.rating ?? 5, approved: Boolean(review?.active) } : null}
              />
            </Card>
          )}

          {requirements.length > 0 && (
            <Card title="Saved requirements" actions={<BellRing className="size-4 text-accent" strokeWidth={1.75} />}>
              <ul className="grid gap-2">
                {requirements.map((r) => {
                  const rs = requirementStatus(r.status);
                  return (
                    <li key={r.id}>
                      <Link href={`/admin/requirements/${r.id}`} className="block rounded-xl border border-line p-3 transition hover:border-accent">
                        <span className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-ink">{requirementRef(r.ref)}</span>
                          <Badge tone={rs.tone}>{rs.label}</Badge>
                          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-soft">
                            {r.alerts ? <BellRing className="size-3 text-accent" /> : <BellOff className="size-3" />} {r.alerts ? "Alerts on" : "Alerts off"}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-ink-soft">{requirementSummary(r)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card title="Source & campaign" actions={<Megaphone className="size-4 text-ink-soft" strokeWidth={1.75} />}>
            <dl className="grid gap-2 text-sm">
              {campaign
                .filter(([, v]) => v !== undefined && v !== null && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-ink-soft">{k}</dt>
                    <dd className="min-w-0 text-right break-words text-ink">{String(v)}</dd>
                  </div>
                ))}
            </dl>
          </Card>
        </aside>

        <div className="grid min-w-0 content-start gap-6 lg:order-1">
          <section id="call-log" className="scroll-mt-20">
            <Card title="Log a call" text="Pick the outcome — status and follow-up update automatically.">
              <CallLogForm leadId={lead.id} />
            </Card>
          </section>

          <Card title="Activity" text={`${activities.length} entries · times in IST`}>
            <div className="mb-6">
              <NoteForm leadId={lead.id} />
            </div>
            <Timeline items={timeline} />
          </Card>
        </div>
      </div>

      {/* Phone action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          <a href={telHref(lead.phone)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-bg active:scale-[0.98]">
            <PhoneCall className="size-4" /> Call
          </a>
          <a
            href={`https://wa.me/91${lead.phone_norm}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-wa text-sm font-medium text-white active:scale-[0.98]"
          >
            <WhatsAppIcon className="size-4" /> WhatsApp
          </a>
          <a href="#call-log" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line text-sm font-medium text-ink active:scale-[0.98]">
            <CalendarClock className="size-4" /> Log
          </a>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] tracking-wide text-ink-soft uppercase">{label}</dt>
      <dd className="truncate text-ink">{value || "—"}</dd>
    </div>
  );
}

const statusLabel = (v: unknown) => leadStatus(String(v ?? "new")).label;

/** Turn a raw activity row into a timeline entry (titles resolved server-side). */
function describe(a: Activity, nameOf: (v: unknown) => string): TimelineEntry {
  const d = a.data ?? {};
  const base = { id: a.id, kind: a.kind, body: a.body, actor: a.actor ? nameOf(a.actor) : "System", at: fmtDate(a.created_at, true), ago: timeAgo(a.created_at) };
  switch (a.kind) {
    case "created":
      return { ...base, title: "Lead created" };
    case "resubmitted":
      return { ...base, title: `Enquired again${d.interest ? ` · ${d.interest}` : ""}`, badge: d.channel ? { label: String(d.channel), tone: "blue" } : undefined };
    case "call": {
      const o = callOutcome(d.outcome);
      const fu = typeof d.follow_up_at === "string" ? ` · next ${fmtFollowUp(d.follow_up_at)}` : "";
      return { ...base, title: `Call logged${fu}`, badge: { label: o.label, tone: o.tone } };
    }
    case "note":
      return { ...base, title: "Note" };
    case "status":
      return { ...base, title: `Status: ${statusLabel(d.from)} → ${statusLabel(d.to)}`, badge: d.via === "call" ? { label: "auto", tone: "neutral" } : undefined };
    case "assigned":
      return { ...base, title: d.to ? `Assigned to ${nameOf(d.to)}${d.from ? ` (from ${nameOf(d.from)})` : ""}` : `Unassigned${d.from ? ` (was ${nameOf(d.from)})` : ""}` };
    case "email":
      return { ...base, title: "Email sent" };
    case "review_requested":
      return { ...base, title: "Review link created" };
    case "review":
      return { ...base, title: `Customer left a review · ${"★".repeat(Number(d.rating) || 0)}`, badge: { label: "review", tone: "green" } };
    case "follow_up":
      return { ...base, title: typeof d.at === "string" ? `Follow-up set for ${fmtFollowUp(d.at)}` : "Follow-up cleared" };
    default:
      return { ...base, title: a.kind.replace(/_/g, " ") };
  }
}
