import "server-only";
import Link from "next/link";
import { Card, Empty } from "@/components/admin/ui";
import { istDayStart } from "@/lib/admin/crm-meta";
import type { StaffLite } from "@/lib/admin/leads-query";
import type { requireStaff } from "@/lib/admin/auth";

type Db = Awaited<ReturnType<typeof requireStaff>>["db"];

/** Monday 00:00 IST of the current week. */
function weekStart() {
  const today = istDayStart();
  const dow = new Date(today.getTime() + 5.5 * 36e5).getUTCDay(); // IST weekday
  return new Date(today.getTime() - ((dow + 6) % 7) * 864e5);
}

function monthStart() {
  const today = istDayStart();
  const ist = new Date(today.getTime() + 5.5 * 36e5);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 36e5);
}

/** Admin-only: per-executive pipeline, activity and conversion. */
export async function TeamPerformance({ db }: { db: Db }) {
  const week = weekStart().toISOString();
  const month = monthStart().getTime();
  const now = new Date().getTime();

  const [{ data: people }, { data: leads }, { data: calls }] = await Promise.all([
    db.from("profiles").select("id, full_name, email, role, active").eq("active", true).order("full_name"),
    db.from("leads").select("assigned_to, status, follow_up_at, updated_at").not("assigned_to", "is", null).limit(10000),
    db.from("lead_activities").select("actor").eq("kind", "call").gte("created_at", week).not("actor", "is", null).limit(10000),
  ]);

  type Stat = { assigned: number; open: number; calls: number; overdue: number; won: number };
  const stats = new Map<string, Stat>();
  const get = (id: string) => stats.get(id) ?? (stats.set(id, { assigned: 0, open: 0, calls: 0, overdue: 0, won: 0 }), stats.get(id)!);

  for (const l of (leads ?? []) as { assigned_to: string; status: string; follow_up_at: string | null; updated_at: string }[]) {
    const s = get(l.assigned_to);
    s.assigned++;
    const closed = l.status === "won" || l.status === "lost";
    if (!closed) s.open++;
    if (!closed && l.follow_up_at && new Date(l.follow_up_at).getTime() < now) s.overdue++;
    if (l.status === "won" && new Date(l.updated_at).getTime() >= month) s.won++;
  }
  for (const c of (calls ?? []) as { actor: string }[]) get(c.actor).calls++;

  const rows = ((people ?? []) as StaffLite[])
    .map((p) => ({ p, s: get(p.id) }))
    .filter(({ p, s }) => p.role === "agent" || s.assigned > 0 || s.calls > 0)
    .sort((a, b) => b.s.calls - a.s.calls || b.s.won - a.s.won);
  const maxCalls = Math.max(1, ...rows.map((r) => r.s.calls));

  const cols = [
    { key: "assigned", label: "Assigned" },
    { key: "open", label: "Open" },
    { key: "calls", label: "Calls this week" },
    { key: "overdue", label: "Overdue" },
    { key: "won", label: "Won this month" },
  ] as const;

  return (
    <Card
      title="Team performance"
      text="Calls counted from Monday (IST)"
      actions={
        <Link href="/admin/follow-ups" className="text-xs font-medium text-accent hover:underline">
          Follow-ups →
        </Link>
      }
    >
      {!rows.length ? (
        <Empty title="No sales executives yet" text="Add agents from the Team page, then assign leads to them." />
      ) : (
        <>
          {/* Phones: one card per executive */}
          <ul className="grid gap-2.5 md:hidden">
            {rows.map(({ p, s }) => (
              <li key={p.id} className="rounded-xl border border-line p-3">
                <Link href={`/admin/leads?owner=${p.id}`} className="font-medium text-ink hover:text-accent">
                  {p.full_name || p.email}
                </Link>
                <dl className="mt-2 grid grid-cols-5 gap-1 text-center">
                  {cols.map((c) => (
                    <div key={c.key}>
                      <dd className={`font-display text-lg ${c.key === "overdue" && s.overdue ? "text-red-600" : "text-ink"}`}>{s[c.key]}</dd>
                      <dt className="text-[10px] leading-tight text-ink-soft">{c.label.replace(" this week", "").replace(" this month", "")}</dt>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="-mx-2 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-ink-soft uppercase">
                  <th className="px-2 pb-2 font-semibold">Executive</th>
                  {cols.map((c) => (
                    <th key={c.key} className="px-2 pb-2 text-right font-semibold">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ p, s }) => (
                  <tr key={p.id}>
                    <td className="px-2 py-2.5">
                      <Link href={`/admin/leads?owner=${p.id}`} className="font-medium text-ink hover:text-accent">
                        {p.full_name || p.email}
                      </Link>
                      <span className="mt-1 block h-1 w-full max-w-40 overflow-hidden rounded-full bg-subtle">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(s.calls / maxCalls) * 100}%` }} />
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{s.assigned}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{s.open}</td>
                    <td className="px-2 py-2.5 text-right font-medium tabular-nums">{s.calls}</td>
                    <td className={`px-2 py-2.5 text-right tabular-nums ${s.overdue ? "font-semibold text-red-600" : ""}`}>{s.overdue}</td>
                    <td className={`px-2 py-2.5 text-right tabular-nums ${s.won ? "font-semibold text-emerald-600" : ""}`}>{s.won}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
