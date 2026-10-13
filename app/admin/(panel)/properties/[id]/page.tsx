import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { localities } from "@/lib/data/properties";
import { ActionButton } from "@/components/admin/forms";
import { PageHeader, button } from "@/components/admin/ui";
import { PropertyForm } from "../PropertyForm";
import { deleteProperty } from "../actions";

export const metadata: Metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params, searchParams }: PageProps<"/admin/properties/[id]">) {
  const { db } = await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const [{ data: p }, { data: all }, { count: enquiries }] = await Promise.all([
    db.from("properties").select("*").eq("id", id).maybeSingle(),
    db.from("properties").select("locality, amenities"),
    db.from("leads").select("*", { count: "exact", head: true }).eq("property_id", id),
  ]);
  if (!p) notFound();
  const used = all ?? [];

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
      <PropertyForm
        property={{
          ...p,
          price: Number(p.price),
          beds: p.beds ?? undefined,
          baths: p.baths ?? undefined,
        }}
        localities={[...new Set([...localities, ...used.map((r) => r.locality)])]}
        amenities={[...new Set(used.flatMap((r) => r.amenities as string[]))]}
      />
    </>
  );
}
