import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight, Download, Layers, UserRound } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { LEAD_STATUSES, leadStatus, timeAgo } from "@/lib/admin/meta";
import { LEAD_INTERESTS, fmtFollowUp, initials, istDayStart } from "@/lib/admin/crm-meta";
import { PAGE_SIZE, applyLeadFilters, filtersToQuery, leadSort, parseFilters, staffMap, staffName, type LeadRow, type StaffLite } from "@/lib/admin/leads-query";
import { Badge, Empty, PageHeader, button } from "@/components/admin/ui";
import { AssignSelect, ContactIcons, FadeIn, StatusSelect } from "@/components/admin/crm/LeadControls";
import { LeadFilters } from "@/components/admin/crm/LeadFilters";
import { AddLeadButton } from "@/components/admin/crm/AddLead";
import { LogCallButton } from "@/components/admin/crm/CallLog";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { staff, db } = await requireStaff();
  const f = parseFilters(await searchParams);
  const isAdmin = staff.role === "admin";
  const sort = leadSort(f);
  const from = (f.page - 1) * PAGE_SIZE;

  const list = applyLeadFilters(db.from("leads").select("*", { count: "exact" }), f, staff)
    .order(sort.column, { ascending: sort.ascending, nullsFirst: sort.nullsFirst })
    .range(from, from + PAGE_SIZE - 1);
  const countFor = (status?: string) => {
    let q = applyLeadFilters(db.from("leads").select("*", { count: "exact", head: true }), f, staff, { withStatus: false });
    if (status) q = q.eq("status", status);
    return q.then((r) => r.count ?? 0);
  };

  const [{ data: rows, count, error }, profilesRes, sourcesRes, ...counts] = await Promise.all([
    list,
    db.from("profiles").select("id, full_name, email, role, active").order("full_name"),
    isAdmin ? db.from("leads").select("source").order("created_at", { ascending: false }).limit(1000) : Promise.resolve({ data: [] as { source: string }[] }),
    countFor(),
    ...LEAD_STATUSES.map((s) => countFor(s.value)),
  ]);

  const leads = (rows ?? []) as LeadRow[];
  const people = (profilesRes.data ?? []) as StaffLite[];
  const byId = staffMap(people);
  const assignable = people.filter((p) => p.active).map((p) => ({ id: p.id, name: p.full_name || p.email }));
  const sources = [...new Set([...(sourcesRes.data ?? []).map((r) => r.source as string), f.source].filter(Boolean))].sort();
  const interests = [...new Set([...LEAD_INTERESTS, f.interest].filter(Boolean))];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const todayStart = istDayStart().getTime();
  const now = new Date().getTime();

  const tabs = [{ value: "", label: "All", count: counts[0] }, ...LEAD_STATUSES.map((s, i) => ({ value: s.value, label: s.label, count: counts[i + 1] }))];
  const href = (patch: Partial<typeof f>) => `/admin/leads${filtersToQuery({ ...f, page: 1, ...patch })}`;

  return (
    <>
      <PageHeader
        title="Leads"
        text={isAdmin ? "Every enquiry from the website, ads, WhatsApp and walk-ins." : "Leads assigned to you. Call, log the outcome, set the next follow-up."}
        actions={
          <>
            {isAdmin && (
              <a href={`/admin/leads/export${filtersToQuery({ ...f, page: 1 })}`} className={button("outline")} download>
                <Download className="size-4" /> Export CSV
              </a>
            )}
            <AddLeadButton staff={assignable} isAdmin={isAdmin} selfId={staff.id} />
          </>
        }
      />

      <nav aria-label="Status" className="-mx-4 mb-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1.5">
          {tabs.map((t) => {
            const on = f.status === t.value;
            return (
              <li key={t.value || "all"}>
                <Link
                  href={href({ status: t.value as typeof f.status })}
                  scroll={false}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition ${
                    on ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-soft hover:border-accent hover:text-ink"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? "bg-bg/20" : "bg-subtle"}`}>{t.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <LeadFilters
        values={{ q: f.q, status: f.status, owner: f.owner, interest: f.interest, source: f.source, from: f.from, to: f.to, sort: f.sort }}
        isAdmin={isAdmin}
        staff={assignable}
        interests={interests}
        sources={sources}
      />

      {error ? (
        <Empty title="Couldn't load leads" text={error.message} />
      ) : !leads.length ? (
        <Empty
          title={f.q || f.status || f.owner || f.interest || f.source || f.from || f.to ? "No leads match these filters" : isAdmin ? "No leads yet" : "No leads assigned to you yet"}
          text={isAdmin ? "Website enquiries land here instantly. You can also add walk-ins with “Add lead”." : "Your admin will assign leads to you — you'll get an email when they do."}
        />
      ) : (
        <>
          <p className="mb-2 px-1 text-xs text-ink-soft">
            Showing {from + 1}–{from + leads.length} of {total}
          </p>
          <ul className="grid gap-2.5">
            {leads.map((l, i) => {
              const st = leadStatus(l.status);
              const fu = l.follow_up_at ? new Date(l.follow_up_at).getTime() : null;
              const closed = l.status === "won" || l.status === "lost";
              const overdue = fu !== null && !closed && fu < now;
              const dueToday = fu !== null && !closed && !overdue && fu < todayStart + 864e5;
              return (
                <FadeIn key={l.id} i={i} as="li" className="rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-accent/50 sm:p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <Link href={`/admin/leads/${l.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{initials(l.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate font-medium text-ink">{l.name}</span>
                          <span className="text-xs text-ink-soft">L-{l.ref}</span>
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {l.submissions > 1 && (
                            <span title="Repeat enquiries" className="inline-flex items-center gap-0.5 text-[11px] text-ink-soft">
                              <Layers className="size-3" />×{l.submissions}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-soft">
                          {l.interest}
                          {l.budget && ` · ${l.budget}`} · {l.source} · {timeAgo(l.created_at)}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {isAdmin && (
                            <span className={`inline-flex items-center gap-1 ${l.assigned_to ? "text-ink" : "text-amber-700 dark:text-amber-300"}`}>
                              <UserRound className="size-3.5" /> {staffName(l.assigned_to ? byId.get(l.assigned_to) : undefined)}
                            </span>
                          )}
                          {fu !== null && !closed && (
                            <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-red-600" : dueToday ? "font-medium text-amber-700 dark:text-amber-300" : "text-ink-soft"}`}>
                              <CalendarClock className="size-3.5" /> {overdue ? "Overdue · " : ""}
                              {fmtFollowUp(l.follow_up_at!)}
                            </span>
                          )}
                          <span className="text-ink-soft md:hidden">{l.phone}</span>
                        </span>
                      </span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 md:border-0 md:pt-0">
                      <span className="hidden text-sm text-ink-soft lg:inline">{l.phone}</span>
                      <ContactIcons phone={l.phone} name={l.name} />
                      <LogCallButton leadId={l.id} leadName={l.name} label="Log" className={button("ghost", "h-9 border border-line")} />
                      <span className="ml-auto flex gap-2 md:ml-0">
                        <StatusSelect id={l.id} status={l.status} className="w-32" />
                        {isAdmin && <AssignSelect id={l.id} assignedTo={l.assigned_to} staff={assignable} className="w-32" />}
                      </span>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </ul>

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
              <PageLink href={href({ page: f.page - 1 })} disabled={f.page <= 1}>
                <ChevronLeft className="size-4" /> Previous
              </PageLink>
              <span className="text-sm text-ink-soft tabular-nums">
                Page {f.page} of {pages}
              </span>
              <PageLink href={href({ page: f.page + 1 })} disabled={f.page >= pages}>
                Next <ChevronRight className="size-4" />
              </PageLink>
            </nav>
          )}
        </>
      )}
    </>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className={button("outline", "pointer-events-none opacity-40")}>{children}</span>;
  return (
    <Link href={href} className={button("outline")}>
      {children}
    </Link>
  );
}
