"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { bool, fail, fieldErrors, mediaPath, ok, optNumber, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";

const MAX_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  title: z.string().min(2, "Add a title, e.g. RERA Registration").max(120),
  category: z.string().min(2, "Pick or type a category").max(40),
  file_url: z.string().refine((v) => /^https?:\/\/\S+\.\S+/.test(v) || /^(data|blob):/.test(v), "Paste a full link starting with https://"),
  file_kind: z.enum(["pdf", "image", "link"]),
  size_bytes: z.number().int().min(0).max(MAX_BYTES, "Files must be 5 MB or smaller").nullable(),
  active: z.boolean(),
});

/** Guess the kind of a pasted link (Drive / any page → "link"). */
function kindOf(url: string): "pdf" | "image" | "link" {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(path)) return "image";
  return "link";
}

const refresh = () => updateTag(TAGS.documents);

/** Add a document — either an uploaded file (url + kind + size from the browser) or a pasted link. */
export async function createDocument(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const url = text(fd, "file_url");
  const uploaded = text(fd, "source") === "upload";
  const parsed = schema.safeParse({
    title: text(fd, "title"),
    category: text(fd, "category"),
    file_url: url,
    file_kind: uploaded ? text(fd, "file_kind") || kindOf(url) : kindOf(url),
    size_bytes: uploaded ? optNumber(fd, "size_bytes") : null,
    active: fd.has("active") ? bool(fd, "active") : true,
  });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const { data: last } = await db.from("documents").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("documents").insert({ ...parsed.data, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return fail(`Couldn't add the document: ${error.message}`);
  refresh();
  return ok(uploaded ? "Document uploaded" : "Link added");
}

export async function updateDocument(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const parsed = schema.pick({ title: true, category: true }).safeParse({ title: text(fd, "title"), category: text(fd, "category") });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const { error } = await db.from("documents").update(parsed.data).eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't save: ${error.message}`);
  refresh();
  return ok("Document saved");
}

export async function toggleDocument(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const active = text(fd, "active") === "true";
  const { error } = await db.from("documents").update({ active }).eq("id", text(fd, "id"));
  if (error) return fail(`Couldn't update: ${error.message}`);
  refresh();
  return ok(active ? "Now visible on the website" : "Hidden from the website");
}

export async function deleteDocument(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = text(fd, "id");
  const { data: row } = await db.from("documents").select("file_url").eq("id", id).maybeSingle();
  const { error } = await db.from("documents").delete().eq("id", id);
  if (error) return fail(`Couldn't delete: ${error.message}`);
  const path = row?.file_url ? mediaPath(row.file_url) : null;
  if (path) {
    const { error: storageError } = await db.storage.from("media").remove([path]);
    refresh();
    if (storageError) return ok(`Document deleted (file cleanup failed: ${storageError.message})`);
    return ok("Document and file deleted");
  }
  refresh();
  return ok("Document deleted");
}

/** Remove a just-uploaded file when saving its row failed (keeps Storage clean). */
export async function discardUpload(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const path = mediaPath(text(fd, "file_url"));
  if (path?.startsWith("documents/")) await db.storage.from("media").remove([path]);
  return ok();
}

export async function moveDocument(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const { data: rows, error } = await db.from("documents").select("id").order("sort_order").order("created_at");
  if (error) return fail(error.message);
  const ids = (rows ?? []).map((r) => String(r.id));
  const i = ids.indexOf(text(fd, "id"));
  const j = i + (text(fd, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= ids.length) return ok();
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const results = await Promise.all(ids.map((id, n) => db.from("documents").update({ sort_order: n }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(`Couldn't reorder: ${failed.error.message}`);
  refresh();
  return ok("Order updated");
}
