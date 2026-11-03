import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/** Ends the live-site preview (no login needed, so nobody gets stuck in preview). */
export async function GET(request: Request) {
  (await draftMode()).disable();
  const back = new URL(request.url).searchParams.get("to") ?? "/admin/settings";
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
