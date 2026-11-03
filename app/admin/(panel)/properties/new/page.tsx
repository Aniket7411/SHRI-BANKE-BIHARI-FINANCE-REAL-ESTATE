import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { loadCities } from "@/lib/admin/cities";
import { PageHeader } from "@/components/admin/ui";
import { PropertyForm } from "../PropertyForm";

export const metadata: Metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  const { db } = await requireAdmin();
  const { data } = await db.from("properties").select("city, locality, amenities");
  const used = data ?? [];
  const cities = await loadCities(db, used);
  return (
    <>
      <PageHeader title="Add property" back={{ href: "/admin/properties", label: "Properties" }} />
      <PropertyForm cities={cities} amenities={[...new Set(used.flatMap((r) => r.amenities as string[]))]} />
    </>
  );
}
