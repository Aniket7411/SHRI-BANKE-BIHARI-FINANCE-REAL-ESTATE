import type { Metadata } from "next";
import { KeyRound, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { fmtDate } from "@/lib/admin/meta";
import { ActionButton, ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { Badge, Card, PageHeader, Table, td } from "@/components/admin/ui";
import { addMember, resetMemberPassword, setMemberActive, setMemberRole } from "./actions";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { db, staff } = await requireAdmin();
  const [{ data: members }, { data: open }] = await Promise.all([
    db.from("profiles").select("*").order("created_at"),
    db.from("leads").select("assigned_to").not("status", "in", "(won,lost)").not("assigned_to", "is", null),
  ]);
  const load = new Map<string, number>();
  for (const l of open ?? []) load.set(l.assigned_to, (load.get(l.assigned_to) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Team" text="Admins manage everything. Agents only see the leads assigned to them." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Table head={["Member", "Role", "Open leads", "Status", ""]}>
          {(members ?? []).map((m) => {
            const self = m.id === staff.id;
            return (
              <tr key={m.id} className={m.active ? "" : "opacity-60"}>
                <td className={td}>
                  <p className="font-medium text-ink">
                    {m.full_name || m.email} {self && <span className="text-xs font-normal text-ink-soft">(you)</span>}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {m.email}
                    {m.phone && ` · ${m.phone}`} · since {fmtDate(m.created_at)}
                  </p>
                </td>
                <td className={td}>
                  {self ? (
                    <Badge tone="accent">{m.role}</Badge>
                  ) : (
                    <ActionButton action={setMemberRole} fields={{ id: m.id, role: m.role === "admin" ? "agent" : "admin" }} title={`Make ${m.role === "admin" ? "agent" : "admin"}`}>
                      <Badge tone={m.role === "admin" ? "accent" : "neutral"}>{m.role}</Badge>
                    </ActionButton>
                  )}
                </td>
                <td className={td}>{load.get(m.id) ?? 0}</td>
                <td className={td}>
                  <Badge tone={m.active ? "green" : "red"}>{m.active ? "Active" : "No access"}</Badge>
                </td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  {!self && (
                    <>
                      <ActionButton action={resetMemberPassword} fields={{ id: m.id }} confirm={`Reset ${m.full_name || m.email}'s password?`} title="Reset password">
                        <KeyRound className="size-4" />
                      </ActionButton>
                      <ActionButton
                        action={setMemberActive}
                        fields={{ id: m.id, active: String(!m.active) }}
                        variant={m.active ? "danger" : "ghost"}
                        confirm={m.active ? `Remove ${m.full_name || m.email}'s access?` : undefined}
                      >
                        {m.active ? "Remove access" : "Restore"}
                      </ActionButton>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>

        <Card title="Add team member" text="They get an email with a temporary password." className="self-start">
          <ActionForm action={addMember} resetOnSuccess className="grid gap-3">
            <Field label="Full name" name="full_name">
              <input name="full_name" className="field-sm" />
            </Field>
            <Field label="Email" name="email">
              <input name="email" type="email" className="field-sm" />
            </Field>
            <Field label="Mobile (optional)" name="phone">
              <input name="phone" type="tel" className="field-sm" />
            </Field>
            <Field label="Role" name="role">
              <select name="role" defaultValue="agent" className="field-sm">
                <option value="agent">Agent (own leads only)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </Field>
            <SubmitButton className="mt-1 h-10 w-full">
              <UserPlus className="size-4" /> Create login
            </SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
