import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getSiteSettings } from "@/lib/api";
import { clientIp, rateLimited } from "@/lib/crm";
import { detailsTable, layout, notifyRecipients, sendMail } from "@/lib/mail";
import { hasServiceRole, supabaseAdmin } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const schema = z.object({
  job: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, ""))),
  email: z.union([z.email().max(200), z.literal("")]).optional(),
  experience: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
});

/** Careers application: stores the resume privately and emails it to the team. */
export async function POST(req: Request) {
  if (rateLimited(`apply:${clientIp(req)}`, 3)) {
    return NextResponse.json({ ok: false, error: "Too many submissions. Please try again later." }, { status: 429 });
  }
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  if (fd.get("website")) return NextResponse.json({ ok: true });

  const fields = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Please check your name and mobile number." }, { status: 422 });
  const input = parsed.data;

  const file = fd.get("resume");
  const resume = file instanceof File && file.size > 0 ? file : null;
  const ext = resume ? RESUME_TYPES[resume.type] : undefined;
  if (resume && (resume.size > MAX_BYTES || !ext)) {
    return NextResponse.json({ ok: false, error: "Resume must be a PDF or Word file under 5 MB." }, { status: 422 });
  }
  const resumeBuf = resume ? Buffer.from(await resume.arrayBuffer()) : null;

  let jobTitle = "General application";
  if (hasServiceRole()) {
    const db = supabaseAdmin();
    let jobId: string | null = null;
    if (input.job) {
      const { data } = await db.from("jobs").select("id, title").eq("slug", input.job).maybeSingle();
      if (data) [jobId, jobTitle] = [data.id, data.title];
    }
    let resumePath: string | null = null;
    if (resume && resumeBuf) {
      resumePath = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("resumes").upload(resumePath, resumeBuf, { contentType: resume.type });
      if (error) {
        console.error("[careers] resume upload:", error.message);
        resumePath = null;
      }
    }
    const { error } = await db.from("job_applications").insert({
      job_id: jobId,
      job_title: jobTitle,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      experience: input.experience || null,
      message: input.message || null,
      resume_path: resumePath,
    });
    if (error) console.error("[careers] insert:", error.message);
  } else {
    console.info("[careers] Supabase not configured — application:", input);
  }

  after(async () => {
    const to = notifyRecipients();
    if (!to.length) return;
    await sendMail({
      to,
      subject: `Job application: ${input.name} · ${jobTitle}`,
      replyTo: input.email || undefined,
      html: layout(
        "New job application",
        detailsTable([
          ["Position", jobTitle],
          ["Name", input.name],
          ["Phone", input.phone],
          ["Email", input.email],
          ["Experience", input.experience],
          ["Message", input.message],
          ["Resume", resume ? "Attached" : "Not provided"],
        ]),
        await getSiteSettings(),
      ),
      attachments:
        resume && resumeBuf
          ? [{ filename: `${input.name.replace(/[^\w]+/g, "_")}_resume.${ext}`, content: resumeBuf, contentType: resume.type }]
          : undefined,
    });
  });

  return NextResponse.json({ ok: true });
}
