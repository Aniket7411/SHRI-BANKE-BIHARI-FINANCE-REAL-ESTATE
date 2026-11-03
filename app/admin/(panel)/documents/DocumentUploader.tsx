"use client";

import { AnimatePresence, motion } from "motion/react";
import { FileUp, Link2, LoaderCircle, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { button } from "@/components/admin/ui";
import { formatBytes, MAX_UPLOAD_BYTES, uploadMediaDetailed } from "@/lib/admin/upload";
import { createDocument, discardUpload } from "./actions";
import { DOC_CATEGORIES } from "./meta";

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

/** Add a document: upload a PDF / image (max 5 MB) to Storage, or paste a link (zero storage). */
export function DocumentUploader() {
  const toast = useToast();
  const [mode, setMode] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    const isImage = f.type.startsWith("image/");
    if (!isPdf && !isImage) {
      toast({ title: "Only PDF or image files", text: "For Word files or folders, upload to Google Drive and paste the link instead.", tone: "error" });
      return;
    }
    // Images get compressed before upload, so only PDFs are rejected up-front.
    if (isPdf && f.size > MAX_UPLOAD_BYTES) {
      toast({ title: `${f.name} is ${formatBytes(f.size)}`, text: "The limit is 5 MB. Compress the PDF or paste a Google Drive link instead.", tone: "error" });
      return;
    }
    setFile(f);
  }

  async function submitFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get("title") ?? "").trim()) {
      toast({ title: "Add a title first", text: "e.g. UP RERA Registration", tone: "error" });
      return;
    }
    if (!file) {
      toast({ title: "Choose a PDF or image to upload", tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const r = await uploadMediaDetailed(file, "documents");
      fd.set("file_url", r.url);
      fd.set("file_kind", r.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image");
      fd.set("size_bytes", String(r.size));
      fd.set("source", "upload");
      const res = await createDocument(fd);
      if (!res.ok) {
        const cleanup = new FormData();
        cleanup.set("file_url", r.url);
        await discardUpload(cleanup).catch(() => undefined);
        toast({ title: res.message ?? "Couldn't save the document", text: res.errors ? Object.values(res.errors).join(" · ") : undefined, tone: "error" });
        return;
      }
      toast({
        title: res.message ?? "Document uploaded",
        text: r.size < r.originalSize ? `Compressed ${formatBytes(r.originalSize)} → ${formatBytes(r.size)}` : formatBytes(r.size),
        tone: "success",
      });
      setFile(null);
      setFormKey((k) => k + 1);
    } catch (err) {
      toast({ title: "Upload failed", text: (err as Error).message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const common = (
    <>
      <Field label="Title" name="title">
        <input name="title" placeholder="e.g. UP RERA Agent Registration" className="field-sm" />
      </Field>
      <Field label="Category" name="category">
        <input name="category" list="doc-categories" defaultValue="Certificate" className="field-sm" />
        <datalist id="doc-categories">
          {DOC_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
    </>
  );

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-line bg-subtle p-1 text-sm">
        {(
          [
            ["file", "Upload file", FileUp],
            ["link", "Paste a link", Link2],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition ${mode === k ? "text-bg" : "text-ink-soft hover:text-ink"}`}
          >
            {mode === k && <motion.span layoutId="doc-mode" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <Icon className="relative size-4" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "file" ? (
          <motion.form key={`file-${formKey}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} onSubmit={submitFile} noValidate className="grid gap-4 sm:grid-cols-2">
            {common}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                pick(e.dataTransfer.files[0]);
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center sm:col-span-2 ${drag ? "border-accent bg-accent-soft" : "border-line"}`}
            >
              {file ? (
                <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left">
                  <Paperclip className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{file.name}</span>
                    <span className="block text-xs text-ink-soft">
                      {formatBytes(file.size)}
                      {file.type.startsWith("image/") && " · will be compressed"}
                    </span>
                  </span>
                  <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="grid size-7 place-items-center rounded-full text-ink-soft hover:bg-subtle hover:text-ink">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <FileUp className="size-6 text-ink-soft" strokeWidth={1.5} />
                  <p className="text-sm text-ink">
                    Drop a PDF or image here, or{" "}
                    <button type="button" onClick={() => input.current?.click()} className="font-semibold text-accent hover:underline">
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-ink-soft">Max 5 MB. Images are compressed automatically.</p>
                </>
              )}
              <input
                ref={input}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <button type="submit" disabled={busy} className={button("primary")}>
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {busy ? "Uploading…" : "Upload document"}
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="link" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <ActionForm action={createDocument} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
              {common}
              <Field label="Link" name="file_url" className="sm:col-span-2" hint="Google Drive (set sharing to “Anyone with the link”), Dropbox or any public page. Uses no storage.">
                <input name="file_url" type="url" inputMode="url" placeholder="https://drive.google.com/file/d/…" className="field-sm" />
              </Field>
              <div className="flex justify-end sm:col-span-2">
                <SubmitButton>Add link</SubmitButton>
              </div>
            </ActionForm>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
