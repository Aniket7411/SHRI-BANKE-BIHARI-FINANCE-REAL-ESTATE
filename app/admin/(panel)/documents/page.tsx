import type { Metadata } from "next";
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, FileText, Image as ImageIcon, Link2, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { formatBytes } from "@/lib/format";
import { ActionButton, ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";
import { deleteDocument, moveDocument, toggleDocument, updateDocument } from "./actions";
import { DocumentUploader } from "./DocumentUploader";
import { DOC_CATEGORIES } from "./meta";

export const metadata: Metadata = { title: "Documents" };

interface DocRow {
  id: string;
  title: string;
  category: string;
  file_url: string;
  file_kind: "pdf" | "image" | "link";
  size_bytes: number | null;
  active: boolean;
}

const KIND = {
  pdf: { icon: FileText, label: "PDF" },
  image: { icon: ImageIcon, label: "Image" },
  link: { icon: Link2, label: "Link" },
} as const;

export default async function DocumentsPage() {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("documents").select("*").order("sort_order").order("created_at");
  const rows = (data ?? []) as DocRow[];
  const stored = rows.reduce((n, r) => n + (r.size_bytes ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Documents"
        text="RERA, GST, registration and bank partner letters. Visible ones appear in “Our Certifications & Documents” above the website footer; the section hides itself when nothing is visible."
      />

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Couldn&apos;t load documents: {error.message}. Has migration 0003_cms.sql been run?</p>}

      <Card title="Add a document" text="Upload a PDF or image (max 5 MB), or paste a Google Drive link to use no storage at all." className="mb-6">
        <DocumentUploader />
      </Card>

      {!rows.length ? (
        <Empty title="No documents yet" text="Add your RERA certificate or GST registration to build trust with visitors." />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-xs text-ink-soft">
            <span>
              {rows.length} document{rows.length > 1 ? "s" : ""} · {rows.filter((r) => r.active).length} visible
            </span>
            {stored > 0 && <span>{formatBytes(stored)} in storage</span>}
          </div>
          <div className="grid gap-3">
            {rows.map((r, i) => {
              const k = KIND[r.file_kind] ?? KIND.link;
              return (
                <details key={r.id} className="group rounded-2xl border border-line bg-surface">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent-soft text-accent-strong">
                      {r.file_kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.file_url} alt="" className="size-full object-cover" />
                      ) : (
                        <k.icon className="size-5" strokeWidth={1.6} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
                        <span className="truncate">{r.title}</span>
                        {!r.active && <Badge tone="amber">Hidden</Badge>}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-soft">
                        <span className="font-semibold tracking-wide text-accent uppercase">{r.category}</span>
                        <span>· {k.label}</span>
                        {r.size_bytes ? <span>· {formatBytes(r.size_bytes)}</span> : r.file_kind === "link" ? <span>· no storage</span> : null}
                      </p>
                    </div>
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer" title="Open" aria-label={`Open ${r.title}`} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-subtle hover:text-accent">
                      <ExternalLink className="size-4" />
                    </a>
                  </summary>
                  <div className="border-t border-line p-4">
                    <ActionForm action={updateDocument} className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
                      <input type="hidden" name="id" value={r.id} />
                      <Field label="Title" name="title">
                        <input name="title" defaultValue={r.title} className="field-sm" />
                      </Field>
                      <Field label="Category" name="category">
                        <input name="category" list={`cat-${r.id}`} defaultValue={r.category} className="field-sm" />
                        <datalist id={`cat-${r.id}`}>
                          {DOC_CATEGORIES.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </Field>
                      <SubmitButton>Save</SubmitButton>
                    </ActionForm>
                    <p className="mt-3 truncate text-xs text-ink-soft">{r.file_url}</p>
                    <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
                      <ActionButton action={moveDocument} fields={{ id: r.id, dir: "up" }} title="Move up">
                        <ArrowUp className={`size-4 ${i === 0 ? "opacity-30" : ""}`} /> Up
                      </ActionButton>
                      <ActionButton action={moveDocument} fields={{ id: r.id, dir: "down" }} title="Move down">
                        <ArrowDown className={`size-4 ${i === rows.length - 1 ? "opacity-30" : ""}`} /> Down
                      </ActionButton>
                      <ActionButton action={toggleDocument} fields={{ id: r.id, active: String(!r.active) }}>
                        {r.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {r.active ? "Hide" : "Show"}
                      </ActionButton>
                      <span className="flex-1" />
                      <ActionButton
                        action={deleteDocument}
                        fields={{ id: r.id }}
                        variant="danger"
                        confirm={r.file_kind === "link" ? `Delete “${r.title}”?` : `Delete “${r.title}” and its uploaded file? This can't be undone.`}
                      >
                        <Trash2 className="size-4" /> Delete
                      </ActionButton>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
