import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { ActionButton, ActionForm, Field, LinesInput, SubmitButton, Toggle } from "@/components/admin/forms";
import { ImagePicker } from "@/components/admin/MediaManager";
import { Card, PageHeader } from "@/components/admin/ui";
import { deleteLoan, saveLoan } from "../actions";

export const metadata: Metadata = { title: "Loan product" };

const ICONS = [
  ["home", "House"],
  ["car", "Car"],
  ["building", "Building"],
  ["briefcase", "Briefcase"],
  ["wallet", "Wallet"],
  ["repeat", "Transfer"],
];

export default async function LoanEditPage({ params }: PageProps<"/admin/loans/[id]">) {
  const { db } = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const { data: l } = isNew ? { data: null } : await db.from("loan_products").select("*").eq("id", id).maybeSingle();
  if (!isNew && !l) notFound();

  return (
    <>
      <PageHeader
        title={l?.name ?? "New loan product"}
        back={{ href: "/admin/loans", label: "Loans & rates" }}
        actions={
          l && l.id !== "home" && l.id !== "vehicle" ? (
            <ActionButton action={deleteLoan} fields={{ id: l.id, redirect: "1" }} variant="danger" confirm={`Delete ${l.name}?`}>
              <Trash2 className="size-4" /> Delete
            </ActionButton>
          ) : undefined
        }
      />
      <ActionForm action={saveLoan} className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {l && <input type="hidden" name="id" value={l.id} />}
        <div className="grid min-w-0 gap-6">
          <Card title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="name">
                <input name="name" defaultValue={l?.name} className="field-sm" />
              </Field>
              <Field label="Icon" name="icon">
                <select name="icon" defaultValue={l?.icon ?? "home"} className="field-sm">
                  {ICONS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Short description" name="short" className="sm:col-span-2">
                <input name="short" defaultValue={l?.short} className="field-sm" />
              </Field>
              <Field label="Starting rate (% p.a.)" name="rate">
                <input name="rate" type="number" step="0.01" defaultValue={l ? Number(l.rate) : undefined} className="field-sm" />
              </Field>
              <Field label="Max tenure (years)" name="max_tenure_years">
                <input name="max_tenure_years" type="number" defaultValue={l?.max_tenure_years} className="field-sm" />
              </Field>
              <Field label="Max amount" name="max_amount" hint="e.g. Up to ₹10 Cr">
                <input name="max_amount" defaultValue={l?.max_amount} className="field-sm" />
              </Field>
              <Field label="Processing" name="processing" hint="e.g. Approval in 24–48 hours">
                <input name="processing" defaultValue={l?.processing} className="field-sm" />
              </Field>
            </div>
          </Card>
          <Card title="Lists" text="One item per line.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Highlights" name="highlights">
                <LinesInput name="highlights" defaultValue={l?.highlights} rows={6} />
              </Field>
              <Field label="Eligibility" name="eligibility">
                <LinesInput name="eligibility" defaultValue={l?.eligibility} rows={6} />
              </Field>
              <Field label="Documents" name="documents">
                <LinesInput name="documents" defaultValue={l?.documents} rows={6} />
              </Field>
            </div>
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card title="Image">
            <ImagePicker name="image" folder="loans" defaultValue={l?.image} />
          </Card>
          <Card title="Visibility">
            <div className="grid gap-3">
              <Toggle name="active" defaultChecked={l?.active ?? true} label="Show on website" />
              <SubmitButton className="h-10 w-full">{l ? "Save changes" : "Create"}</SubmitButton>
            </div>
          </Card>
        </div>
      </ActionForm>
    </>
  );
}
