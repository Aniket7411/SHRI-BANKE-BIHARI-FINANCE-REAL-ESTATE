import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

/** Opens a resume from the private bucket via a 2-minute signed link. */
export async function GET(_: Request, { params }: RouteContext<"/admin/careers/resume/[id]">) {
  const { db } = await requireAdmin();
  const { id } = await params;
  const { data } = await db.from("job_applications").select("resume_path").eq("id", id).maybeSingle();
  if (!data?.resume_path) return new NextResponse("Resume not found", { status: 404 });
  const { data: signed, error } = await db.storage.from("resumes").createSignedUrl(data.resume_path, 120);
  if (error || !signed) return new NextResponse("Could not open resume", { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
