import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { ActionButton, ActionForm, Field, LinesInput, SubmitButton } from "@/components/admin/forms";
import { Card, PageHeader } from "@/components/admin/ui";
import { deleteJob, saveJob } from "../actions";

export const metadata: Metadata = { title: "Job" };

export default async function JobEditPage({ params, searchParams }: PageProps<"/admin/careers/[id]">) {
  const { db } = await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const isNew = id === "new";
  const { data: j } = isNew ? { data: null } : await db.from("jobs").select("*").eq("id", id).maybeSingle();
  if (!isNew && !j) notFound();

  return (
    <>
      <PageHeader
        title={j?.title ?? "Post a job"}
        back={{ href: "/admin/careers", label: "Careers" }}
        actions={
          j ? (
            <ActionButton action={deleteJob} fields={{ id: j.id, redirect: "1" }} variant="danger" confirm={`Delete "${j.title}"? Applications are kept.`}>
              <Trash2 className="size-4" /> Delete
            </ActionButton>
          ) : undefined
        }
      />
      {created && <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-strong">Job posted. It&apos;s now live on the Careers page.</p>}
      <ActionForm action={saveJob} className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {j && <input type="hidden" name="id" value={j.id} />}
        <div className="grid min-w-0 gap-6">
          <Card title="Role">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Job title" name="title" className="sm:col-span-2">
                <input name="title" defaultValue={j?.title} placeholder="e.g. Property Sales Executive" className="field-sm" />
              </Field>
              <Field label="Department" name="department">
                <input name="department" defaultValue={j?.department} placeholder="Real Estate / Finance / Operations" className="field-sm" />
              </Field>
              <Field label="Location" name="location">
                <input name="location" defaultValue={j?.location ?? "Kanpur"} className="field-sm" />
              </Field>
              <Field label="Employment type" name="employment_type">
                <select name="employment_type" defaultValue={j?.employment_type ?? "Full-time"} className="field-sm">
                  {["Full-time", "Part-time", "Internship", "Contract", "Commission-based"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Experience" name="experience">
                <input name="experience" defaultValue={j?.experience} placeholder="e.g. 1–3 years" className="field-sm" />
              </Field>
              <Field label="Salary" name="salary" className="sm:col-span-2">
                <input name="salary" defaultValue={j?.salary} placeholder="e.g. ₹18,000 – ₹30,000 / month + incentives" className="field-sm" />
              </Field>
              <Field label="About the role" name="description" className="sm:col-span-2">
                <textarea name="description" defaultValue={j?.description} rows={4} className="field-sm resize-y" />
              </Field>
            </div>
          </Card>
          <Card title="Details" text="One item per line.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What you'll do" name="responsibilities">
                <LinesInput name="responsibilities" defaultValue={j?.responsibilities} rows={6} />
              </Field>
              <Field label="What we're looking for" name="requirements">
                <LinesInput name="requirements" defaultValue={j?.requirements} rows={6} />
              </Field>
            </div>
          </Card>
        </div>
        <Card title="Publish" className="self-start">
          <div className="grid gap-3">
            <Field label="Status" name="status">
              <select name="status" defaultValue={j?.status ?? "open"} className="field-sm">
                <option value="open">Open (shown on website)</option>
                <option value="closed">Closed (hidden)</option>
              </select>
            </Field>
            <SubmitButton className="h-10 w-full">{j ? "Save changes" : "Post job"}</SubmitButton>
          </div>
        </Card>
      </ActionForm>
    </>
  );
}
