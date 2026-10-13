import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Downscale + convert photos to WebP in the browser before upload, so phone
 * photos (5–10 MB) become ~200–400 KB without visible quality loss.
 */
export async function compressImage(file: File, maxSide = 2000, quality = 0.82): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Upload to the public "media" bucket and return its public URL. */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const isImage = file.type.startsWith("image/");
  const body = isImage ? await compressImage(file) : file;
  const ext = body.type === "image/webp" ? "webp" : (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `${folder}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const db = supabaseBrowser();
  const { error } = await db.storage.from("media").upload(path, body, { contentType: body.type || file.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return db.storage.from("media").getPublicUrl(path).data.publicUrl;
}
