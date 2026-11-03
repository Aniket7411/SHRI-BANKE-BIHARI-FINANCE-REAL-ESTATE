import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, CalendarCheck, CalendarDays, ChevronRight, PartyPopper, UserRound, type LucideIcon } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { leadStatus, timeAgo } from "@/lib/admin/meta";
import { callOutcome, fmtFollowUp, initials, istDayStart } from "@/lib/admin/crm-meta";
import { staffMap, staffName, type LeadRow, type StaffLite } from "@/lib/admin/leads-query";
import { Badge, Empty, PageHeader } from "@/components/admin/ui";
import { ContactIcons, FadeIn } from "@/components/admin/crm/LeadControls";
import { LogCallButton } from "@/components/admin/crm/CallLog";
import { OwnerFilter } from "@/components/admin/crm/OwnerFilter";

export const metadata: Metadata = { title: "Follow-ups" };

type Lead = Pick<LeadRow, "id" | "ref" | "name" | "phone" | "interest" | "status" | "assigned_to" | "follow_up_at" | "budget">;

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { staff, db } = await requireStaff();
  const sp = await searchParams;
  const isAdmin = staff.role === "admin";
  const owner = isAdmin ? (typeof sp.owner === "string" ? sp.owner : "") : staff.id;

  const todayStart = istDayStart().getTime();
  const tomorrow = todayStart + 864e5;
  const horizon = tomorrow + 7 * 864e5;

  let q = db
    .from("leads")
    .select("id, ref, name, phone, interest, status, assigned_to, follow_up_at, budget")
    .not("follow_up_at", "is", null)
    .not("status", "in", "(won,lost)")
    .lt("follow_up_at", new Date(horizon).toISOString())
    .order("follow_up_at")
    .limit(500);
  if (owner) q = q.eq("assigned_to", owner);

  const [{ data, error }, { data: profiles }] = await Promise.all([q, db.from("profiles").select("id, full_name, email, role, active").order("full_name")]);
  const leads = (data ?? []) as Lead[];
  const byId = staffMap(profiles as StaffLite[] | null);

  // Latest call outcome per lead, for context on the card.
  const lastCall = new Map<string, { outcome: unknown; at: string }>();
  if (leads.length) {
    const { data: calls } = await db
      .from("lead_activities")
      .select("lead_id, data, created_at")
      .eq("kind", "call")
      .in(
        "lead_id",
        leads.map((l) => l.id),
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    for (const c of calls ?? []) if (!lastCall.has(c.lead_id)) lastCall.set(c.lead_id, { outcome: (c.data as Record<string, unknown> | null)?.outcome, at: c.created_at });
  }

  const at = (l: Lead) => new Date(l.follow_up_at!).getTime();
  const sections: { key: string; title: string; text: string; icon: LucideIcon; tone: string; items: Lead[] }[] = [
    { key: "overdue", title: "Overdue", text: "Missed — call these first", icon: AlarmClock, tone: "text-red-600", items: leads.filter((l) => at(l) < todayStart) },
    { key: "today", title: "Today", text: "Due before midnight", icon: CalendarCheck, tone: "text-amber-600", items: leads.filter((l) => at(l) >= todayStart && at(l) < tomorrow) },
    { key: "upcoming", title: "Next 7 days", text: "Plan ahead", icon: CalendarDays, tone: "text-sky-600", items: leads.filter((l) => at(l) >= tomorrow) },
  ];
  const now = new Date().getTime();
  const assignable = ((profiles ?? []) as StaffLite[]).filter((p) => p.active).map((p) => ({ id: p.id, name: p.full_name || p.email }));

  return (
    <>
      <PageHeader
        title={isAdmin && !owner ? "Follow-ups" : "My follow-ups"}
        text="Times are in IST. Tap to call or WhatsApp, then log the outcome."
        actions={isAdmin ? <OwnerFilter value={owner} staff={assignable} selfId={staff.id} /> : undefined}
      />

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        {sections.map((s) => (
          <a key={s.key} href={`#${s.key}`} className="rounded-2xl border border-line bg-surface p-3 transition hover:border-accent sm:p-4">
            <s.icon className={`size-4 ${s.tone}`} strokeWidth={1.75} />
            <p className={`mt-2 font-display text-2xl sm:text-3xl ${s.key === "overdue" && s.items.length ? "text-red-600" : "text-ink"}`}>{s.items.length}</p>
            <p className="text-xs text-ink-soft">{s.title}</p>
          </a>
        ))}
      </div>

      {error ? (
        <Empty title="Couldn't load follow-ups" text={error.message} />
      ) : !leads.length ? (
        <Empty
          title="All caught up"
          text="No follow-ups in the next 7 days. Log a call on any lead to schedule one."
          action={
            <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm font-medium text-accent">
              <PartyPopper className="size-4" /> Go to leads
            </Link>
          }
        />
      ) : (
        <div className="grid gap-8">
          {sections
            .filter((s) => s.items.length)
            .map((s) => (
              <section key={s.key} id={s.key} className="scroll-mt-20">
                <h2 className="mb-3 flex items-baseline gap-2">
                  <span className={`text-base font-semibold ${s.key === "overdue" ? "text-red-600" : "text-ink"}`}>{s.title}</span>
                  <span className="text-xs text-ink-soft">
                    {s.items.length} · {s.text}
                  </span>
                </h2>
                <ul className="grid gap-2.5 md:grid-cols-2">
                  {s.items.map((l, i) => {
                    const st = leadStatus(l.status);
                    const last = lastCall.get(l.id);
                    const lastO = last ? callOutcome(last.outcome) : null;
                    const late = s.key === "overdue" || (s.key === "today" && at(l) < now);
                    return (
                      <FadeIn
                        key={l.id}
                        i={i}
                        as="li"
                        className={`rounded-2xl border bg-surface p-4 ${s.key === "overdue" ? "border-red-200 dark:border-red-900" : "border-line"}`}
                      >
                        <Link href={`/admin/leads/${l.id}`} className="group flex items-start gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{initials(l.name)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate font-medium text-ink group-hover:text-accent">{l.name}</span>
                              <Badge tone={st.tone}>{st.label}</Badge>
                            </span>
                            <span className={`mt-0.5 block text-sm font-medium ${late ? "text-red-600" : "text-ink"}`}>
                              {fmtFollowUp(l.follow_up_at!)}
                              {s.key === "overdue" && <span className="font-normal"> · {timeAgo(l.follow_up_at!)}</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-ink-soft">
                              L-{l.ref} · {l.interest}
                              {l.budget && ` · ${l.budget}`}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                              {lastO && last && (
                                <span>
                                  Last call: <span className="font-medium text-ink">{lastO.label}</span> · {timeAgo(last.at)}
                                </span>
                              )}
                              {isAdmin && (
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="size-3" /> {staffName(l.assigned_to ? byId.get(l.assigned_to) : undefined)}
                                </span>
                              )}
                            </span>
                          </span>
                          <ChevronRight className="mt-2 size-4 shrink-0 text-ink-soft transition group-hover:translate-x-0.5" />
                        </Link>
                        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                          <ContactIcons phone={l.phone} name={l.name} />
                          <span className="truncate text-sm text-ink-soft">{l.phone}</span>
                          <LogCallButton
                            leadId={l.id}
                            leadName={l.name}
                            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bg transition hover:bg-accent hover:text-accent-fg active:scale-95"
                          />
                        </div>
                      </FadeIn>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}
    </>
  );
}
