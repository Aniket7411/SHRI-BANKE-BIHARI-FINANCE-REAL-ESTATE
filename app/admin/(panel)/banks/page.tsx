import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, Percent, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { ActionButton, ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";
import { ImagePicker } from "@/components/admin/MediaManager";
import { BankLogo } from "@/components/loans/BankLogo";
import { BANK_KINDS } from "@/lib/banks";
import { createBank, deleteBank, moveBank, toggleBank, updateBank } from "./actions";

export const metadata: Metadata = { title: "Banks" };

interface BankRow {
  id: string;
  name: string;
  kind: string;
  logo: string;
  active: boolean;
}

export default async function BanksPage() {
  const { db } = await requireAdmin();
  const [{ data, error }, { data: rates }] = await Promise.all([
    db.from("banks").select("id, name, kind, logo, active").order("sort_order").order("name"),
    db.from("bank_rates").select("bank_id"),
  ]);
  const rows = (data ?? []) as BankRow[];
  const count = (id: string) => (rates ?? []).filter((r) => r.bank_id === id).length;

  return (
    <>
      <PageHeader
        title="Banks"
        text="Partner banks shown on the website with their logo. Add a bank here, then enter its rates in Bank rates — visitors compare them on the Loans page, lowest first."
      />

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Couldn&apos;t load banks: {error.message}. Has migration 0008_banks.sql been run?</p>}

      <Card title="Add a bank" text="Upload the bank's logo (PNG or JPG, ideally on a white or transparent background)." className="mb-6">
        <ActionForm action={createBank} resetOnSuccess className="grid gap-4 sm:grid-cols-[auto_1fr_200px_auto] sm:items-start">
          <BankFields />
          <SubmitButton className="sm:mt-[22px]">Add bank</SubmitButton>
        </ActionForm>
      </Card>

      {!rows.length ? (
        <Empty title="No banks yet" text="Add the banks you work with, e.g. State Bank of India, Bank of Baroda, PNB." />
      ) : (
        <div className="grid gap-3">
          {rows.map((r, i) => {
            const n = count(r.id);
            return (
              <details key={r.id} className="group rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 sm:p-4">
                  <BankLogo bank={r} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
                      {r.name}
                      {!r.active && <Badge tone="amber">Hidden</Badge>}
                      {!r.logo && <Badge>No logo</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {r.kind} ·{" "}
                      <Link href="/admin/rates" className="hover:text-accent hover:underline">
                        {n ? `${n} rate${n === 1 ? "" : "s"}` : "No rates yet"}
                      </Link>
                    </p>
                  </div>
                </summary>
                <div className="border-t border-line p-4">
                  <ActionForm action={updateBank} className="grid gap-4 sm:grid-cols-[auto_1fr_200px_auto] sm:items-start">
                    <input type="hidden" name="id" value={r.id} />
                    <BankFields row={r} />
                    <SubmitButton className="sm:mt-[22px]">Save</SubmitButton>
                  </ActionForm>
                  <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
                    <ActionButton action={moveBank} fields={{ id: r.id, dir: "up" }} title="Move up">
                      <ArrowUp className={`size-4 ${i === 0 ? "opacity-30" : ""}`} /> Up
                    </ActionButton>
                    <ActionButton action={moveBank} fields={{ id: r.id, dir: "down" }} title="Move down">
                      <ArrowDown className={`size-4 ${i === rows.length - 1 ? "opacity-30" : ""}`} /> Down
                    </ActionButton>
                    <ActionButton action={toggleBank} fields={{ id: r.id, active: String(!r.active) }}>
                      {r.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {r.active ? "Hide" : "Show"}
                    </ActionButton>
                    <Link href="/admin/rates" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft hover:bg-subtle hover:text-ink">
                      <Percent className="size-4" /> Rates
                    </Link>
                    <span className="flex-1" />
                    <ActionButton action={deleteBank} fields={{ id: r.id }} variant="danger" confirm={`Delete ${r.name}${n ? ` and its ${n} rate${n === 1 ? "" : "s"}` : ""}?`}>
                      <Trash2 className="size-4" /> Delete
                    </ActionButton>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}

function BankFields({ row }: { row?: BankRow }) {
  return (
    <>
      <Field label="Logo" name="logo">
        <ImagePicker name="logo" folder="banks" defaultValue={row?.logo} />
      </Field>
      <Field label="Bank name" name="name">
        <input name="name" defaultValue={row?.name} placeholder="e.g. Bank of Baroda" className="field-sm" />
      </Field>
      <Field label="Type" name="kind">
        <select name="kind" defaultValue={row?.kind ?? "Government"} className="field-sm">
          {BANK_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}
