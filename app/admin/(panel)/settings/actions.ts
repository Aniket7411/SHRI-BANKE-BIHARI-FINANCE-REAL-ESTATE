"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { fail, fieldErrors, ok, text, type ActionResult } from "@/lib/admin/form";
import { TAGS } from "@/lib/cache-tags";

const url = z.union([z.url("Enter a full link starting with https://"), z.literal("")]);

const schema = z.object({
  phone: z.string().min(8, "Enter the phone number"),
  whatsapp: z.string().regex(/^\d{10,15}$/, "Digits only, with country code, e.g. 919876543210"),
  email: z.email("Enter a valid email"),
  address: z.string().min(5, "Enter the address"),
  hours: z.string().max(120),
  instagram: url,
  instagramHandle: z.string().max(80),
  facebook: url,
  youtube: url,
  stats: z
    .array(z.object({ value: z.number(), suffix: z.string().max(10), label: z.string().min(1).max(40), decimals: z.number().int().min(0).max(2).optional() }))
    .max(4),
});

export async function saveSettings(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const stats = [0, 1, 2, 3]
    .map((i) => {
      const raw = text(fd, `stat_value_${i}`);
      const label = text(fd, `stat_label_${i}`);
      if (!raw || !label) return null;
      const decimals = raw.includes(".") ? Math.min(2, raw.split(".")[1].length) : undefined;
      return { value: Number(raw), suffix: text(fd, `stat_suffix_${i}`), label, ...(decimals ? { decimals } : {}) };
    })
    .filter((s) => s !== null);

  const parsed = schema.safeParse({
    phone: text(fd, "phone"),
    whatsapp: text(fd, "whatsapp").replace(/\D/g, ""),
    email: text(fd, "email"),
    address: text(fd, "address"),
    hours: text(fd, "hours"),
    instagram: text(fd, "instagram"),
    instagramHandle: text(fd, "instagramHandle"),
    facebook: text(fd, "facebook"),
    youtube: text(fd, "youtube"),
    stats,
  });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));

  const { error } = await db.from("site_settings").upsert({ id: 1, data: parsed.data });
  if (error) return fail(error.message);
  updateTag(TAGS.settings);
  return ok("Settings saved. The website is updated.");
}
