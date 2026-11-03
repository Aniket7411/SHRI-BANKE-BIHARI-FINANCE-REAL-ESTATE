import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { loadCities } from "@/lib/admin/cities";
import { categoryOf, normalizeType } from "@/lib/property-meta";
import { ActionButton } from "@/components/admin/forms";
import { Card, PageHeader, button } from "@/components/admin/ui";
import { AlertPicker, type PickerRow } from "@/components/admin/requirements/AlertControls";
import { waHref } from "@/lib/admin/crm-meta";
import { requirementsMatching, type AlertPropertyRow } from "@/lib/admin/requirements";
import { requirementRef, requirementSummary } from "@/lib/requirements";
import { alertWhatsAppText } from "@/lib/requirements-server";
import { PropertyForm } from "../PropertyForm";
import { deleteProperty } from "../actions";

export const metadata: Metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params, searchParams }: PageProps<"/admin/properties/[id]">) {
  const { db } = await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const [{ data: p }, { data: all }, { count: enquiries }] = await Promise.all([
    db.from("properties").select("*").eq("id", id).maybeSingle(),
    db.from("properties").select("city, locality, amenities"),
    db.from("leads").select("*", { count: "exact", head: true }).eq("property_id", id),
  ]);
  if (!p) notFound();
  const used = all ?? [];
  // Table from migration 0009; if it hasn't run yet the card just shows nothing.
  const matching = await requirementsMatching(db, p as AlertPropertyRow).catch(() => []);
  const pickerRows: PickerRow[] = matching.map(({ requirement: r, sent }) => ({
    id: r.id,
    ref: requirementRef(r.ref),
    name: r.name,
    phone: r.phone,
    email: r.email,
    alerts: r.alerts,
    status: r.status,
    summary: requirementSummary(r),
    createdAt: r.created_at,
    emailedAt: sent.email,
    whatsappAt: sent.whatsapp,
    waLink: waHref(r.phone, alertWhatsAppText(r, p as AlertPropertyRow)),
  }));
  const cities = await loadCities(db, used);

  return (
    <>
      <PageHeader
        title={p.title}
        text={`${enquiries ?? 0} enquiries so far`}
        back={{ href: "/admin/properties", label: "Properties" }}
        actions={
          <>
            {p.status !== "draft" && (
              <a href={`/properties/${p.id}`} target="_blank" className={button("outline")}>
                <ExternalLink className="size-4" /> View on site
              </a>
            )}
            <ActionButton action={deleteProperty} fields={{ id: p.id, redirect: "1" }} variant="danger" confirm={`Delete "${p.title}" and its photos? This can't be undone.`}>
              <Trash2 className="size-4" /> Delete
            </ActionButton>
          </>
        }
      />
      {created && <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-strong">Property created. Add photos below and save.</p>}
      <Card
        className="mb-6"
        title={`Matching requirements (${pickerRows.length})`}
        text="Customers who asked for a property like this. Choose who to notify — nothing is sent automatically."
      >
        <AlertPicker propertyId={p.id} rows={pickerRows} published={p.status === "published"} />
      </Card>
      <PropertyForm
        property={{
          ...p,
          type: normalizeType(p.type),
          category: p.category ?? categoryOf(normalizeType(p.type)),
          city: p.city || "Kanpur",
          details: p.details ?? {},
          price: Number(p.price),
          beds: p.beds ?? undefined,
          baths: p.baths ?? undefined,
        }}
        cities={cities}
        amenities={[...new Set(used.flatMap((r) => r.amenities as string[]))]}
      />
    </>
  );
}
