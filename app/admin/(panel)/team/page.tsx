import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { fmtDate } from "@/lib/admin/meta";
import { ActionButton } from "@/components/admin/forms";
import { AddMemberCard, SetPasswordButton } from "@/components/admin/team/TeamForms";
import { Badge, Card, PageHeader, Table, td } from "@/components/admin/ui";
import { setMemberActive, setMemberRole } from "./actions";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { db, staff } = await requireAdmin();
  const [{ data: members }, { data: open }] = await Promise.all([
    db.from("profiles").select("*").order("created_at"),
    db.from("leads").select("assigned_to").not("status", "in", "(won,lost)").not("assigned_to", "is", null),
  ]);
  const load = new Map<string, number>();
  for (const l of open ?? []) load.set(l.assigned_to, (load.get(l.assigned_to) ?? 0) + 1);
  // You manage your own login under My account, so the list shows everyone else.
  const others = (members ?? []).filter((m) => m.id !== staff.id);

  return (
    <>
      <PageHeader title="Team" text="Admins manage everything. Sales members only see the leads assigned to them, and only an admin can set their password." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Table head={["Member", "Role", "Open leads", "Status", ""]}>
          {!others.length && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">
                No team members yet. Add your agents or another admin with the form.
              </td>
            </tr>
          )}
          {others.map((m) => (
            <tr key={m.id} className={m.active ? "" : "opacity-60"}>
              <td className={td}>
                <p className="font-medium text-ink">{m.full_name || m.email}</p>
                <p className="text-xs text-ink-soft">
                  {m.email}
                  {m.phone && ` · ${m.phone}`} · since {fmtDate(m.created_at)}
                </p>
              </td>
              <td className={td}>
                <ActionButton
                  action={setMemberRole}
                  fields={{ id: m.id, role: m.role === "admin" ? "agent" : "admin" }}
                  title={`Click to make ${m.role === "admin" ? "Sales" : "Admin"}`}
                >
                  <Badge tone={m.role === "admin" ? "accent" : "neutral"}>{m.role === "admin" ? "Admin" : "Sales"}</Badge>
                </ActionButton>
              </td>
              <td className={td}>{load.get(m.id) ?? 0}</td>
              <td className={td}>
                <Badge tone={m.active ? "green" : "red"}>{m.active ? "Active" : "No access"}</Badge>
              </td>
              <td className={`${td} text-right whitespace-nowrap`}>
                <SetPasswordButton id={m.id} name={m.full_name || m.email} />
                <ActionButton
                  action={setMemberActive}
                  fields={{ id: m.id, active: String(!m.active) }}
                  variant={m.active ? "danger" : "ghost"}
                  confirm={m.active ? `Remove ${m.full_name || m.email}'s access?` : undefined}
                >
                  {m.active ? "Remove access" : "Restore"}
                </ActionButton>
              </td>
            </tr>
          ))}
        </Table>

        <Card
          title="Add team member"
          text="Choose their login email and password, then share them yourself. Only you can set a new password later."
          className="self-start"
        >
          <AddMemberCard />
        </Card>
      </div>
    </>
  );
}
