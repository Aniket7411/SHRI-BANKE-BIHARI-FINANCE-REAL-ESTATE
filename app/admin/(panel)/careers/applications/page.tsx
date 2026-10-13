import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { APPLICATION_STATUSES, applicationStatus, fmtDate } from "@/lib/admin/meta";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/forms";
import { Badge, Empty, PageHeader, button } from "@/components/admin/ui";
import { deleteApplication, updateApplication } from "../actions";

export const metadata: Metadata = { title: "Job applications" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/careers/applications">) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const job = typeof sp.job === "string" ? sp.job : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  let q = db.from("job_applications").select("*").order("created_at", { ascending: false }).limit(200);
  if (job) q = q.eq("job_id", job);
  if (status) q = q.eq("status", status);
  const [{ data: apps }, { data: jobs }] = await Promise.all([q, db.from("jobs").select("id, title").order("created_at", { ascending: false })]);

  return (
    <>
      <PageHeader title="Job applications" back={{ href: "/admin/careers", label: "Careers" }} />
      <form className="mb-4 flex flex-col gap-2 sm:flex-row">
        <select name="job" defaultValue={job} className="field-sm sm:w-64">
          <option value="">All roles</option>
          {(jobs ?? []).map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="field-sm sm:w-44">
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className={button("outline")}>Filter</button>
        {(job || status) && (
          <Link href="/admin/careers/applications" className={button("ghost", "h-9")}>
            Clear
          </Link>
        )}
      </form>

      {!apps?.length ? (
        <Empty title="No applications yet" text="Applications from the Careers page will appear here and in your inbox." />
      ) : (
        <div className="grid gap-3">
          {apps.map((a) => {
            const st = applicationStatus(a.status);
            return (
              <div key={a.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {a.name} <Badge tone={st.tone}>{st.label}</Badge>
                    </p>
                    <p className="text-sm text-ink-soft">
                      {a.job_title} · {fmtDate(a.created_at, true)}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <a href={`tel:${a.phone}`} className="text-ink hover:text-accent">
                        {a.phone}
                      </a>
                      {a.email && (
                        <a href={`mailto:${a.email}`} className="text-ink hover:text-accent">
                          {a.email}
                        </a>
                      )}
                      {a.experience && <span className="text-ink-soft">{a.experience}</span>}
                    </p>
                    {a.message && <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">{a.message}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {a.resume_path && (
                      <a href={`/admin/careers/resume/${a.id}`} target="_blank" className={button("outline")}>
                        <FileText className="size-4" /> Resume
                      </a>
                    )}
                    <ActionButton action={deleteApplication} fields={{ id: a.id }} variant="danger" confirm={`Delete ${a.name}'s application and resume?`} title="Delete">
                      <Trash2 className="size-4" />
                    </ActionButton>
                  </div>
                </div>
                <ActionForm action={updateApplication} className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row">
                  <input type="hidden" name="id" value={a.id} />
                  <select name="status" defaultValue={a.status} className="field-sm sm:w-40">
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <input name="notes" defaultValue={a.notes ?? ""} placeholder="Private notes (interview date, feedback…)" className="field-sm flex-1" />
                  <SubmitButton variant="outline">Save</SubmitButton>
                </ActionForm>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
