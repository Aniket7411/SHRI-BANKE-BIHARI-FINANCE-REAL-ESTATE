import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { localities } from "@/lib/data/properties";
import { PageHeader } from "@/components/admin/ui";
import { PropertyForm } from "../PropertyForm";

export const metadata: Metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  const { db } = await requireAdmin();
  const { data } = await db.from("properties").select("locality, amenities");
  const used = data ?? [];
  return (
    <>
      <PageHeader title="Add property" back={{ href: "/admin/properties", label: "Properties" }} />
      <PropertyForm localities={[...new Set([...localities, ...used.map((r) => r.locality)])]} amenities={[...new Set(used.flatMap((r) => r.amenities as string[]))]} />
    </>
  );
}
