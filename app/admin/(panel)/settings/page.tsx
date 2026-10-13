import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getSiteSettings } from "@/lib/api";
import { ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { Card, PageHeader } from "@/components/admin/ui";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSiteSettings();
  const stats = [0, 1, 2, 3].map((i) => s.stats[i]);

  return (
    <>
      <PageHeader title="Settings" text="Contact details used across the website, emails and the WhatsApp button." />
      <ActionForm action={saveSettings} className="grid gap-6">
        <Card title="Contact details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone (shown on site)" name="phone">
              <input name="phone" defaultValue={s.phone} className="field-sm" />
            </Field>
            <Field label="WhatsApp number" name="whatsapp" hint="Country code + number, digits only: 919876543210">
              <input name="whatsapp" defaultValue={s.whatsapp} inputMode="numeric" className="field-sm" />
            </Field>
            <Field label="Email" name="email">
              <input name="email" type="email" defaultValue={s.email} className="field-sm" />
            </Field>
            <Field label="Office hours" name="hours">
              <input name="hours" defaultValue={s.hours} className="field-sm" />
            </Field>
            <Field label="Office address" name="address" className="sm:col-span-2" hint="Also used for the map on the Contact page.">
              <input name="address" defaultValue={s.address} className="field-sm" />
            </Field>
          </div>
        </Card>

        <Card title="Social media">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instagram link" name="instagram">
              <input name="instagram" defaultValue={s.instagram} placeholder="https://instagram.com/…" className="field-sm" />
            </Field>
            <Field label="Instagram handle" name="instagramHandle">
              <input name="instagramHandle" defaultValue={s.instagramHandle} placeholder="@yourhandle" className="field-sm" />
            </Field>
            <Field label="Facebook page link" name="facebook">
              <input name="facebook" defaultValue={s.facebook} placeholder="https://facebook.com/…" className="field-sm" />
            </Field>
            <Field label="YouTube channel link" name="youtube">
              <input name="youtube" defaultValue={s.youtube} placeholder="https://youtube.com/@…" className="field-sm" />
            </Field>
          </div>
        </Card>

        <Card title="Homepage numbers" text="The four counters under the hero. Leave a row empty to hide it.">
          <div className="grid gap-3">
            {stats.map((st, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px] gap-2 sm:grid-cols-[120px_90px_1fr]">
                <input name={`stat_value_${i}`} defaultValue={st?.value} type="number" step="any" placeholder="1500" aria-label="Number" className="field-sm" />
                <input name={`stat_suffix_${i}`} defaultValue={st?.suffix} placeholder="+" aria-label="Suffix" className="field-sm" />
                <input name={`stat_label_${i}`} defaultValue={st?.label} placeholder="Happy families" aria-label="Label" className="field-sm col-span-2 sm:col-span-1" />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Interest rates">
          <p className="text-sm text-ink-soft">
            Home loans from <strong className="text-ink">{s.rates.home}%</strong>, vehicle loans from <strong className="text-ink">{s.rates.vehicle}%</strong>. Change these in{" "}
            <Link href="/admin/loans" className="font-medium text-accent hover:underline">
              Loans &amp; rates
            </Link>
            .
          </p>
        </Card>

        <div className="flex justify-end">
          <SubmitButton className="h-10 px-6">Save settings</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
