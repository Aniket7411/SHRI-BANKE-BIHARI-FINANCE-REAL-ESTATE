import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { Card, PageHeader } from "@/components/admin/ui";
import { changePassword, updateProfile } from "./actions";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const { staff, db } = await requireStaff();
  const { data: me } = await db.from("profiles").select("full_name, phone").eq("id", staff.id).single();

  return (
    <>
      <PageHeader title="My account" text={`${staff.email} · ${staff.role}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <ActionForm action={updateProfile} className="grid gap-3">
            <Field label="Full name" name="full_name">
              <input name="full_name" defaultValue={me?.full_name} className="field-sm" />
            </Field>
            <Field label="Mobile" name="phone">
              <input name="phone" type="tel" defaultValue={me?.phone ?? ""} className="field-sm" />
            </Field>
            <SubmitButton className="mt-1 justify-self-start">Save</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Change password">
          <ActionForm action={changePassword} resetOnSuccess className="grid gap-3">
            <Field label="New password" name="password" hint="At least 8 characters.">
              <input name="password" type="password" autoComplete="new-password" className="field-sm" />
            </Field>
            <Field label="Confirm new password" name="confirm">
              <input name="confirm" type="password" autoComplete="new-password" className="field-sm" />
            </Field>
            <SubmitButton className="mt-1 justify-self-start">Update password</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
