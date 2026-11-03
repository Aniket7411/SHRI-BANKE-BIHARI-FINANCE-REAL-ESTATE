import { NextResponse } from "next/server";
import { getStaff } from "@/lib/admin/auth";
import { getDemoObject, putDemoObject, removeDemoObjects } from "@/lib/demo/db";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Buckets anyone may read (like Supabase public buckets). Everything else needs a staff login. */
const PUBLIC_BUCKETS = new Set(["media", "public", "documents"]);
const MAX_BYTES = 50 * 1024 * 1024;

type Ctx = RouteContext<"/api/demo-files/[bucket]/[...path]">;
const notFound = () => new NextResponse("Not found", { status: 404 });

/** Demo mode only: serves files saved by the demo storage. */
export async function GET(_: Request, { params }: Ctx) {
  if (isSupabaseConfigured) return notFound();
  const { bucket, path } = await params;
  if (!PUBLIC_BUCKETS.has(bucket) && !(await getStaff())) return new NextResponse("Sign in to view this file", { status: 401 });
  const file = getDemoObject(bucket, path.join("/"));
  if (!file) return notFound();
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "content-type": file.type,
      "content-length": String(file.data.length),
      "cache-control": PUBLIC_BUCKETS.has(bucket) ? "public, max-age=31536000, immutable" : "private, no-store",
    },
  });
}

/** Demo mode only: upload from the admin panel (multipart field "file"). */
export async function POST(req: Request, { params }: Ctx) {
  if (isSupabaseConfigured) return notFound();
  if (!(await getStaff())) return NextResponse.json({ data: null, error: { message: "Please sign in again." } }, { status: 401 });
  const { bucket, path } = await params;
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ data: null, error: { message: "No file received" } }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ data: null, error: { message: "Payload too large" } }, { status: 413 });
  const res = await putDemoObject(bucket, path.join("/"), file, String(fd?.get("contentType") ?? "") || file.type, fd?.get("upsert") === "1");
  if (res.error) return NextResponse.json({ data: null, error: res.error }, { status: 409 });
  return NextResponse.json({ data: { path: res.path }, error: null });
}

/** Demo mode only: delete a stored file. */
export async function DELETE(_: Request, { params }: Ctx) {
  if (isSupabaseConfigured) return notFound();
  if (!(await getStaff())) return NextResponse.json({ data: null, error: { message: "Please sign in again." } }, { status: 401 });
  const { bucket, path } = await params;
  return NextResponse.json({ data: removeDemoObjects(bucket, [path.join("/")]), error: null });
}
