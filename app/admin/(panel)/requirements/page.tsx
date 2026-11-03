import type { Metadata } from "next";
import Link from "next/link";
import { BellOff, BellRing, Building2, Search, Send } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { timeAgo } from "@/lib/admin/meta";
import { initials } from "@/lib/admin/crm-meta";
import { livePropertiesForMatching } from "@/lib/admin/requirements";
import { REQUIREMENT_STATUSES, matchesRequirement, requirementChips, requirementRef, requirementStatus, type RequirementRow } from "@/lib/requirements";
import { Badge, Empty, PageHeader, button } from "@/components/admin/ui";
import { ContactIcons, FadeIn } from "@/components/admin/crm/LeadControls";
import { RequirementStatusSelect } from "@/components/admin/requirements/AlertControls";

export const metadata: Metadata = { title: "Requirements" };

const LIMIT = 300;
type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function RequirementsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { staff, db } = await requireStaff();
  const sp = await searchParams;
  const f = {
    status: one(sp.status) || "active",
    q: one(sp.q).trim(),
    purpose: ["Buy", "Rent"].includes(one(sp.purpose)) ? one(sp.purpose) : "",
    alerts: ["on", "off"].includes(one(sp.alerts)) ? one(sp.alerts) : "",
    city: one(sp.city),
  };
  const isAdmin = staff.role === "admin";

  let q = db.from("requirements").select("*").order("created_at", { ascending: false }).limit(LIMIT);
  if (f.status !== "all") q = q.eq("status", f.status);
  if (f.purpose) q = q.eq("purpose", f.purpose);
  if (f.alerts) q = q.eq("alerts", f.alerts === "on");
  if (f.city) q = q.eq("city", f.city);
  const term = f.q.replace(/[,()%*\\]/g, " ").trim();
  if (term) {
    const ref = term.match(/^R-?(\d{2,})$/i)?.[1];
    const digits = term.replace(/[\s+-]/g, "");
    if (ref) q = q.eq("ref", Number(ref));
    else if (/^\d{4,}$/.test(digits)) q = q.ilike("phone_norm", `%${digits.slice(-10)}%`);
    else q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const countFor = (status?: string) => {
    let c = db.from("requirements").select("*", { count: "exact", head: true });
    if (status) c = c.eq("status", status);
    return c.then((r) => r.count ?? 0);
  };

  const [{ data, error }, properties, citiesRes, ...counts] = await Promise.all([
    q,
    livePropertiesForMatching(db),
    db.from("requirements").select("city").neq("city", "").limit(1000),
    countFor(),
    ...REQUIREMENT_STATUSES.map((s) => countFor(s.value)),
  ]);
  const rows = (data ?? []) as RequirementRow[];
  const cities = [...new Set([...(citiesRes.data ?? []).map((r) => r.city as string), f.city].filter(Boolean))].sort();
  const tabs = [...REQUIREMENT_STATUSES.map((s, i) => ({ value: s.value as string, label: s.label, count: counts[i + 1] })), { value: "all", label: "All", count: counts[0] }];
  const href = (patch: Partial<typeof f>) => {
    const next = { ...f, ...patch };
    const p = new URLSearchParams();
    if (next.status !== "active") p.set("status", next.status);
    for (const k of ["q", "purpose", "alerts", "city"] as const) if (next[k]) p.set(k, next[k]);
    return `/admin/requirements${p.size ? `?${p}` : ""}`;
  };
  const filtered = Boolean(f.q || f.purpose || f.alerts || f.city);
  const deleted = one(sp.deleted);

  return (
    <>
      <PageHeader
        title="Requirements"
        text={
          isAdmin
            ? "What customers told us they're looking for. Match them to new listings and send alerts."
            : "Requirements from leads assigned to you. Call them when a matching property comes in."
        }
      />

      {deleted && <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-strong">Requirement deleted.</p>}

      <nav aria-label="Status" className="-mx-4 mb-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1.5">
          {tabs.map((t) => {
            const on = f.status === t.value;
            return (
              <li key={t.value}>
                <Link
                  href={href({ status: t.value })}
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

      <form className="mb-4 grid gap-2 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]" role="search">
        {f.status !== "active" && <input type="hidden" name="status" value={f.status} />}
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
          <input name="q" defaultValue={f.q} placeholder="Name, phone, email or R-101" aria-label="Search requirements" className="field-sm h-10 pl-9" />
        </label>
        <select name="purpose" defaultValue={f.purpose} aria-label="Buy or rent" className="field-sm h-10 !py-0">
          <option value="">Buy & rent</option>
          <option value="Buy">Buy</option>
          <option value="Rent">Rent</option>
        </select>
        <select name="city" defaultValue={f.city} aria-label="City" className="field-sm h-10 !py-0">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select name="alerts" defaultValue={f.alerts} aria-label="Alerts" className="field-sm h-10 !py-0">
          <option value="">Alerts: any</option>
          <option value="on">Alerts on</option>
          <option value="off">Alerts off</option>
        </select>
        <div className="flex gap-2">
          <button className={button("primary", "h-10 flex-1")}>Apply</button>
          {filtered && (
            <Link href={href({ q: "", purpose: "", alerts: "", city: "" })} className={button("ghost", "h-10")}>
              Clear
            </Link>
          )}
        </div>
      </form>

      {error ? (
        <Empty
          title="Couldn't load requirements"
          text={error.message.includes("requirements") ? "Run supabase/migrations/0009_requirements.sql in the Supabase SQL editor, then reload." : error.message}
        />
      ) : !rows.length ? (
        <Empty
          title={filtered ? "No requirements match these filters" : f.status === "active" ? "No open requirements yet" : "Nothing here"}
          text={
            isAdmin
              ? "Visitors save requirements from the Properties page and the homepage (“Get alerts”). They land here and in Leads."
              : "When a lead assigned to you saves a requirement, it shows up here."
          }
        />
      ) : (
        <>
          <p className="mb-2 px-1 text-xs text-ink-soft">
            {rows.length === LIMIT ? `Showing the latest ${LIMIT}` : `${rows.length} ${rows.length === 1 ? "requirement" : "requirements"}`}
          </p>
          <ul className="grid gap-2.5">
            {rows.map((r, i) => {
              const st = requirementStatus(r.status);
              const matches = properties.filter((p) => matchesRequirement(p, r));
              const fresh = r.last_notified_at ? matches.filter((p) => p.created_at > r.last_notified_at!).length : matches.length;
              return (
                <FadeIn key={r.id} i={i} as="li" className="rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-accent/50 sm:p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <Link href={`/admin/requirements/${r.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{initials(r.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate font-medium text-ink">{r.name}</span>
                          <span className="text-xs text-ink-soft">{requirementRef(r.ref)}</span>
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {r.alerts ? (
                            <span title="Wants new-listing alerts" className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                              <BellRing className="size-3" /> Alerts
                            </span>
                          ) : (
                            <span title="Alerts off" className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
                              <BellOff className="size-3" /> Off
                            </span>
                          )}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {requirementChips(r).map((c) => (
                            <span key={c} className="rounded-md bg-subtle px-2 py-0.5 text-[11px] text-ink">
                              {c}
                            </span>
                          ))}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                          <span className={`inline-flex items-center gap-1 ${matches.length ? "font-medium text-ink" : ""}`}>
                            <Building2 className="size-3.5" /> {matches.length} matching {matches.length === 1 ? "listing" : "listings"}
                            {fresh > 0 && matches.length > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-fg">{fresh} new</span>}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Send className="size-3" /> {r.last_notified_at ? `Notified ${timeAgo(r.last_notified_at)}` : "Never notified"}
                          </span>
                          <span>Asked {timeAgo(r.created_at)}</span>
                          <span className="md:hidden">{r.phone}</span>
                        </span>
                      </span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 md:border-0 md:pt-0">
                      <span className="hidden text-sm text-ink-soft lg:inline">{r.phone}</span>
                      <ContactIcons phone={r.phone} name={r.name} />
                      <RequirementStatusSelect id={r.id} status={r.status} className="ml-auto w-32 md:ml-0" />
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
