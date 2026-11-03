import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/admin/auth";

/** Admins only: turn on Draft Mode so the public site shows live data before going live. */
export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login?next=/admin/settings");
  if (staff.role !== "admin") redirect("/admin?denied=1");
  (await draftMode()).enable();
  const to = new URL(request.url).searchParams.get("to") ?? "/";
  redirect(to.startsWith("/") && !to.startsWith("//") ? to : "/");
}
