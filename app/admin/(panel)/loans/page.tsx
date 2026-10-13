import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/forms";
import { Badge, ButtonLink, Empty, PageHeader, button } from "@/components/admin/ui";
import { moveLoan, setLoanRate } from "./actions";

export const metadata: Metadata = { title: "Loans & rates" };

export default async function LoansAdminPage() {
  const { db } = await requireAdmin();
  const { data: loans } = await db.from("loan_products").select("id, name, short, rate, max_tenure_years, active").order("sort_order");

  return (
    <>
      <PageHeader
        title="Loans & rates"
        text="Update a rate and it changes everywhere: homepage, loans page, EMI calculators and property pages."
        actions={
          <ButtonLink href="/admin/loans/new">
            <Plus className="size-4" /> Add loan product
          </ButtonLink>
        }
      />
      {!loans?.length ? (
        <Empty title="No loan products yet" text="Run the seed script or add one." />
      ) : (
        <div className="grid gap-3">
          {loans.map((l, i) => (
            <div key={l.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
                <ActionButton action={moveLoan} fields={{ id: l.id, dir: "up" }} title="Move up">
                  <ArrowUp className={`size-4 ${i === 0 ? "opacity-30" : ""}`} />
                </ActionButton>
                <ActionButton action={moveLoan} fields={{ id: l.id, dir: "down" }} title="Move down">
                  <ArrowDown className={`size-4 ${i === loans.length - 1 ? "opacity-30" : ""}`} />
                </ActionButton>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-ink">
                  {l.name} {!l.active && <Badge>Hidden</Badge>}
                </p>
                <p className="truncate text-sm text-ink-soft">{l.short}</p>
                <p className="mt-1 text-xs text-ink-soft">Up to {l.max_tenure_years} years</p>
              </div>
              <ActionForm action={setLoanRate} className="flex items-center gap-2">
                <input type="hidden" name="id" value={l.id} />
                <div className="relative">
                  <input name="rate" type="number" step="0.01" min={0} max={40} defaultValue={Number(l.rate)} aria-label={`${l.name} rate`} className="field-sm w-28 pr-14 font-semibold" />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-soft">% p.a.</span>
                </div>
                <SubmitButton variant="outline">Update</SubmitButton>
              </ActionForm>
              <Link href={`/admin/loans/${l.id}`} className={button("ghost", "h-9")}>
                <Pencil className="size-4" /> Edit details
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
