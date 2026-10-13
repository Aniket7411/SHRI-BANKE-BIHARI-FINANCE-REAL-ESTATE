import Link from "next/link";
import { AlarmClock, Briefcase, Building2, Inbox, TrendingUp, Trophy } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { leadStatus, timeAgo } from "@/lib/admin/meta";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const { staff, db } = await requireStaff();
  const { denied } = await searchParams;
  const isAdmin = staff.role === "admin";

  const now = new Date();
  const startOfDay = new Date(now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30");
  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const monthStart = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
  const endOfDay = new Date(startOfDay.getTime() + 864e5);

  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const leads = () => db.from("leads").select("*", { count: "exact", head: true });

  const [today, week, open, wonMonth, published, openJobs, newApps, recent, due] = await Promise.all([
    count(leads().gte("created_at", startOfDay.toISOString())),
    count(leads().gte("created_at", weekAgo.toISOString())),
    count(leads().not("status", "in", "(won,lost)")),
    count(leads().eq("status", "won").gte("updated_at", monthStart.toISOString())),
    isAdmin ? count(db.from("properties").select("*", { count: "exact", head: true }).eq("status", "published")) : 0,
    isAdmin ? count(db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open")) : 0,
    isAdmin ? count(db.from("job_applications").select("*", { count: "exact", head: true }).eq("status", "new")) : 0,
    db.from("leads").select("id, ref, name, phone, interest, source, status, created_at").order("created_at", { ascending: false }).limit(8),
    db
      .from("leads")
      .select("id, ref, name, phone, follow_up_at, status")
      .not("status", "in", "(won,lost)")
      .lt("follow_up_at", endOfDay.toISOString())
      .order("follow_up_at")
      .limit(8),
  ]);

  const stats = [
    { label: "Leads today", value: today, icon: Inbox },
    { label: "Last 7 days", value: week, icon: TrendingUp },
    { label: "Open leads", value: open, icon: AlarmClock },
    { label: "Won this month", value: wonMonth, icon: Trophy },
    ...(isAdmin
      ? [
          { label: "Live properties", value: published, icon: Building2, href: "/admin/properties" },
          { label: "New job applications", value: newApps, icon: Briefcase, href: "/admin/careers/applications", sub: `${openJobs} open roles` },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title={`Namaste, ${staff.fullName.split(" ")[0]}`} text={isAdmin ? "Here's what's happening across the business." : "Here are the leads assigned to you."} />
      {denied && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">That section is for admins only.</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, icon: Icon, ...s }) => {
          const body = (
            <>
              <Icon className="size-4 text-accent" strokeWidth={1.75} />
              <p className="mt-3 font-display text-3xl text-ink">{value}</p>
              <p className="text-xs text-ink-soft">{label}</p>
              {"sub" in s && <p className="mt-0.5 text-[11px] text-ink-soft">{s.sub}</p>}
            </>
          );
          return "href" in s && s.href ? (
            <Link key={label} href={s.href} className="rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
              {body}
            </Link>
          ) : (
            <div key={label} className="rounded-2xl border border-line bg-surface p-4">
              {body}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Latest leads" text="Newest enquiries from the website and ads">
          {recent.data?.length ? (
            <ul className="-mx-2 divide-y divide-line">
              {recent.data.map((l) => {
                const st = leadStatus(l.status);
                return (
                  <li key={l.id} className="flex items-center gap-3 px-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {l.name} <span className="font-normal text-ink-soft">· L-{l.ref}</span>
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {l.interest} · {l.source} · {timeAgo(l.created_at)}
                      </p>
                    </div>
                    <a href={`tel:${l.phone}`} className="hidden text-xs text-ink-soft hover:text-accent sm:block">
                      {l.phone}
                    </a>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="No leads yet" text="Website enquiries will appear here the moment they arrive." />
          )}
        </Card>

        <Card title="Follow-ups due" text="Today and overdue">
          {due.data?.length ? (
            <ul className="-mx-2 divide-y divide-line">
              {due.data.map((l) => {
                const overdue = new Date(l.follow_up_at) < startOfDay;
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{l.name}</p>
                      <a href={`tel:${l.phone}`} className="text-xs text-ink-soft hover:text-accent">
                        {l.phone}
                      </a>
                    </div>
                    <Badge tone={overdue ? "red" : "amber"}>{overdue ? "Overdue" : "Today"}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="All caught up" text="No follow-ups due today." />
          )}
        </Card>
      </div>
    </>
  );
}
