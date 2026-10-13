import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Pencil, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { fmtDate } from "@/lib/admin/meta";
import { ActionButton } from "@/components/admin/forms";
import { Badge, ButtonLink, Empty, PageHeader, Table, button, td } from "@/components/admin/ui";
import { setJobStatus } from "./actions";

export const metadata: Metadata = { title: "Careers" };

export default async function CareersAdminPage() {
  const { db } = await requireAdmin();
  const [{ data: jobs }, { data: apps }] = await Promise.all([
    db.from("jobs").select("id, slug, title, department, status, created_at").order("sort_order").order("created_at", { ascending: false }),
    db.from("job_applications").select("job_id, status"),
  ]);
  const counts = new Map<string, { total: number; fresh: number }>();
  for (const a of apps ?? []) {
    const c = counts.get(a.job_id) ?? { total: 0, fresh: 0 };
    c.total++;
    if (a.status === "new") c.fresh++;
    counts.set(a.job_id, c);
  }
  const newTotal = (apps ?? []).filter((a) => a.status === "new").length;

  return (
    <>
      <PageHeader
        title="Careers"
        text="Open roles are listed on the website's Careers page."
        actions={
          <>
            <ButtonLink href="/admin/careers/applications" variant="outline">
              <Inbox className="size-4" /> Applications {newTotal > 0 && <Badge tone="blue">{newTotal} new</Badge>}
            </ButtonLink>
            <ButtonLink href="/admin/careers/new">
              <Plus className="size-4" /> Post a job
            </ButtonLink>
          </>
        }
      />
      {!jobs?.length ? (
        <Empty title="No jobs posted" text="Post a role and it appears on /careers straight away." action={<ButtonLink href="/admin/careers/new">Post a job</ButtonLink>} />
      ) : (
        <Table head={["Role", "Status", "Applications", "Posted", ""]}>
          {jobs.map((j) => {
            const c = counts.get(j.id);
            return (
              <tr key={j.id} className="hover:bg-subtle/60">
                <td className={td}>
                  <Link href={`/admin/careers/${j.id}`} className="font-medium text-ink hover:text-accent">
                    {j.title}
                  </Link>
                  <p className="text-xs text-ink-soft">{j.department}</p>
                </td>
                <td className={td}>
                  <Badge tone={j.status === "open" ? "green" : "neutral"}>{j.status === "open" ? "Open" : "Closed"}</Badge>
                </td>
                <td className={td}>
                  <Link href={`/admin/careers/applications?job=${j.id}`} className="text-ink hover:text-accent">
                    {c?.total ?? 0}
                    {c?.fresh ? <span className="ml-1 text-xs text-sky-600">({c.fresh} new)</span> : null}
                  </Link>
                </td>
                <td className={`${td} text-xs text-ink-soft`}>{fmtDate(j.created_at)}</td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  <ActionButton action={setJobStatus} fields={{ id: j.id, status: j.status === "open" ? "closed" : "open" }}>
                    {j.status === "open" ? "Close" : "Reopen"}
                  </ActionButton>
                  <Link href={`/admin/careers/${j.id}`} className={button("ghost")} aria-label="Edit" title="Edit">
                    <Pencil className="size-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
