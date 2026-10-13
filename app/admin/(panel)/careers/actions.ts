"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { fail, fieldErrors, lines, ok, slugify, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";

const schema = z.object({
  title: z.string().min(3, "Add a job title"),
  department: z.string().max(80),
  location: z.string().max(80),
  employment_type: z.string().max(40),
  experience: z.string().max(80),
  salary: z.string().max(120),
  description: z.string().max(4000),
  responsibilities: z.array(z.string()).max(20),
  requirements: z.array(z.string()).max(20),
  status: z.enum(["open", "closed"]),
});

export async function saveJob(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = schema.safeParse({
    title: text(fd, "title"),
    department: text(fd, "department"),
    location: text(fd, "location") || "Kanpur",
    employment_type: text(fd, "employment_type") || "Full-time",
    experience: text(fd, "experience"),
    salary: text(fd, "salary"),
    description: text(fd, "description"),
    responsibilities: lines(fd, "responsibilities"),
    requirements: lines(fd, "requirements"),
    status: text(fd, "status") || "open",
  });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));

  const id = text(fd, "id");
  if (id) {
    const { error } = await db.from("jobs").update(parsed.data).eq("id", id);
    if (error) return fail(error.message);
    updateTag(TAGS.jobs);
    return ok("Job saved");
  }
  const base = slugify(parsed.data.title) || "job";
  let slug = base;
  for (let n = 2; ; n++) {
    const { data } = await db.from("jobs").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }
  const { data, error } = await db.from("jobs").insert({ ...parsed.data, slug }).select("id").single();
  if (error) return fail(error.message);
  updateTag(TAGS.jobs);
  redirect(`/admin/careers/${data.id}?created=1`);
}

export async function setJobStatus(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const status = text(fd, "status") === "open" ? "open" : "closed";
  const { error } = await db.from("jobs").update({ status }).eq("id", text(fd, "id"));
  if (error) return fail(error.message);
  updateTag(TAGS.jobs);
  return ok(status === "open" ? "Job reopened" : "Job closed");
}

export async function deleteJob(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { error } = await db.from("jobs").delete().eq("id", text(fd, "id"));
  if (error) return fail(error.message);
  updateTag(TAGS.jobs);
  if (text(fd, "redirect")) redirect("/admin/careers");
  return ok("Job deleted. Its applications are kept.");
}

export async function updateApplication(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const patch: Record<string, string> = {};
  const status = text(fd, "status");
  if (["new", "shortlisted", "interview", "hired", "rejected"].includes(status)) patch.status = status;
  if (fd.has("notes")) patch.notes = text(fd, "notes");
  const { error } = await db.from("job_applications").update(patch).eq("id", text(fd, "id"));
  if (error) return fail(error.message);
  return ok("Application updated");
}

export async function deleteApplication(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = text(fd, "id");
  const { data } = await db.from("job_applications").select("resume_path").eq("id", id).single();
  const { error } = await db.from("job_applications").delete().eq("id", id);
  if (error) return fail(error.message);
  if (data?.resume_path) await db.storage.from("resumes").remove([data.resume_path]);
  return ok("Application deleted");
}
