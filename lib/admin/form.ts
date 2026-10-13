import { z } from "zod";

/** What every admin Server Action returns to <ActionForm>. */
export interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export const ok = (message?: string): ActionResult => ({ ok: true, message });
export const fail = (message: string, errors?: Record<string, string>): ActionResult => ({ ok: false, message, errors });

/** Turn a zod error into { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/* FormData readers — checkboxes, JSON arrays from <ChipsInput>, one-per-line textareas. */
export const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export const lines = (fd: FormData, k: string) =>
  text(fd, k)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
export function jsonList(fd: FormData, k: string): string[] {
  try {
    const v = JSON.parse(String(fd.get(k) ?? "[]"));
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}
export const optNumber = (fd: FormData, k: string) => {
  const v = text(fd, k);
  return v === "" ? null : Number(v);
};

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Public-bucket object path from a Supabase Storage public URL (null for external URLs). */
export function mediaPath(url: string) {
  const marker = "/storage/v1/object/public/media/";
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}
