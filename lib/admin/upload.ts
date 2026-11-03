import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatBytes } from "@/lib/format";

export { formatBytes };

/** Hard limit for anything stored in the "media" bucket (matches the bucket's file_size_limit). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Downscale + convert photos to WebP in the browser before upload, so phone
 * photos (5–10 MB) become ~150–400 KB without visible quality loss.
 * Keeps the original when it is already smaller (or the browser can't decode it).
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    return blob && blob.type === "image/webp" && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export interface UploadResult {
  url: string;
  /** Storage object path inside the "media" bucket */
  path: string;
  originalSize: number;
  size: number;
  type: string;
}

/**
 * Upload to the public "media" bucket. Images are compressed first; anything still
 * over `maxBytes` is rejected with a readable error before touching Storage.
 */
export async function uploadMediaDetailed(file: File, folder: string, { maxBytes = MAX_UPLOAD_BYTES }: { maxBytes?: number } = {}): Promise<UploadResult> {
  const isImage = file.type.startsWith("image/");
  const body = isImage ? await compressImage(file) : file;
  if (body.size > maxBytes) {
    throw new Error(`${file.name} is ${formatBytes(body.size)}${isImage ? " even after compression" : ""}. The limit is ${formatBytes(maxBytes)} — compress it or paste a Google Drive link instead.`);
  }
  const ext = body.type === "image/webp" ? "webp" : (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `${folder}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const db = supabaseBrowser();
  const type = body.type || file.type || "application/octet-stream";
  const { error } = await db.storage.from("media").upload(path, body, { contentType: type, cacheControl: "31536000" });
  if (error) throw new Error(/exceeded|too large|payload/i.test(error.message) ? `File is larger than ${formatBytes(maxBytes)}.` : error.message);
  return { url: db.storage.from("media").getPublicUrl(path).data.publicUrl, path, originalSize: file.size, size: body.size, type };
}

/** Upload to the public "media" bucket and return its public URL. */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  return (await uploadMediaDetailed(file, folder)).url;
}
