import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { ActionButton, ActionForm, Field, SubmitButton, Toggle } from "@/components/admin/forms";
import { ImagePicker } from "@/components/admin/MediaManager";
import { Badge, PageHeader } from "@/components/admin/ui";
import { deleteContent, moveContent, saveContent } from "./actions";

export const metadata: Metadata = { title: "Reviews & FAQs" };

type Testimonial = { id: number; name: string; role: string; quote: string; avatar: string; rating: number; active: boolean };
type Faq = { id: number; q: string; a: string; active: boolean };

export default async function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  const { db } = await requireAdmin();
  const tab = (await searchParams).tab === "faqs" ? "faqs" : "testimonials";
  const { data } = await db.from(tab).select("*").order("sort_order").order("id");
  const rows = data ?? [];

  return (
    <>
      <PageHeader title="Reviews & FAQs" text="Customer reviews appear on the homepage; FAQs on the Loans and Contact pages." />
      <div className="mb-5 inline-flex rounded-full border border-line bg-surface p-1 text-sm">
        {[
          ["testimonials", "Customer reviews"],
          ["faqs", "FAQs"],
        ].map(([k, label]) => (
          <Link key={k} href={`/admin/content?tab=${k}`} className={`rounded-full px-4 py-1.5 ${tab === k ? "bg-ink text-bg" : "text-ink-soft hover:text-ink"}`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {rows.map((r, i) => (
          <details key={r.id} className="group rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                {tab === "testimonials" ? (
                  <>
                    <p className="flex items-center gap-2 font-medium text-ink">
                      {(r as Testimonial).name}
                      <span className="flex text-accent">
                        {Array.from({ length: (r as Testimonial).rating }).map((_, k) => (
                          <Star key={k} className="size-3 fill-current" />
                        ))}
                      </span>
                      {!r.active && <Badge>Hidden</Badge>}
                    </p>
                    <p className="truncate text-sm text-ink-soft">“{(r as Testimonial).quote}”</p>
                  </>
                ) : (
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <span className="truncate">{(r as Faq).q}</span>
                    {!r.active && <Badge>Hidden</Badge>}
                  </p>
                )}
              </div>
              <span className="text-xs text-ink-soft group-open:hidden">Edit</span>
            </summary>
            <div className="border-t border-line p-4">
              <ContentForm tab={tab} row={r} />
              <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
                <ActionButton action={moveContent} fields={{ table: tab, id: String(r.id), dir: "up" }} title="Move up">
                  <ArrowUp className={`size-4 ${i === 0 ? "opacity-30" : ""}`} /> Up
                </ActionButton>
                <ActionButton action={moveContent} fields={{ table: tab, id: String(r.id), dir: "down" }} title="Move down">
                  <ArrowDown className={`size-4 ${i === rows.length - 1 ? "opacity-30" : ""}`} /> Down
                </ActionButton>
                <span className="flex-1" />
                <ActionButton action={deleteContent} fields={{ table: tab, id: String(r.id) }} variant="danger" confirm="Delete this item?">
                  <Trash2 className="size-4" /> Delete
                </ActionButton>
              </div>
            </div>
          </details>
        ))}

        <details className="rounded-2xl border border-dashed border-line bg-surface" open={!rows.length}>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium text-ink">
            <Plus className="size-4" /> {tab === "testimonials" ? "Add a review" : "Add a question"}
          </summary>
          <div className="border-t border-line p-4">
            <ContentForm tab={tab} />
          </div>
        </details>
      </div>
    </>
  );
}

function ContentForm({ tab, row }: { tab: "testimonials" | "faqs"; row?: Testimonial | Faq }) {
  return (
    <ActionForm action={saveContent} resetOnSuccess={!row} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="table" value={tab} />
      {row && <input type="hidden" name="id" value={row.id} />}
      {tab === "testimonials" ? (
        <TestimonialFields t={row as Testimonial | undefined} />
      ) : (
        <>
          <Field label="Question" name="q" className="sm:col-span-2">
            <input name="q" defaultValue={(row as Faq | undefined)?.q} className="field-sm" />
          </Field>
          <Field label="Answer" name="a" className="sm:col-span-2">
            <textarea name="a" defaultValue={(row as Faq | undefined)?.a} rows={4} className="field-sm resize-y" />
          </Field>
        </>
      )}
      <Toggle name="active" defaultChecked={row?.active ?? true} label="Show on website" />
      <div className="flex items-end justify-end">
        <SubmitButton>{row ? "Save" : "Add"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function TestimonialFields({ t }: { t?: Testimonial }) {
  return (
    <>
      <Field label="Customer name" name="name">
        <input name="name" defaultValue={t?.name} className="field-sm" />
      </Field>
      <Field label="Who they are" name="role" hint="e.g. Home buyer, Swaroop Nagar">
        <input name="role" defaultValue={t?.role} className="field-sm" />
      </Field>
      <Field label="Review" name="quote" className="sm:col-span-2">
        <textarea name="quote" defaultValue={t?.quote} rows={3} className="field-sm resize-y" />
      </Field>
      <Field label="Rating" name="rating">
        <select name="rating" defaultValue={t?.rating ?? 5} className="field-sm">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Photo (optional)">
        <ImagePicker name="avatar" folder="testimonials" defaultValue={t?.avatar} />
      </Field>
    </>
  );
}
