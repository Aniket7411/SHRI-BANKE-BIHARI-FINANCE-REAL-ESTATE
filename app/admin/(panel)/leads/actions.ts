"use server";

import { refresh } from "next/cache";
import { getSiteSettings } from "@/lib/api";
import { requireStaff, type Staff } from "@/lib/admin/auth";
import { fail, fieldErrors, ok, text, type ActionResult } from "@/lib/admin/form";
import { LEAD_STATUSES, leadStatus, type LeadStatus } from "@/lib/admin/meta";
import { CLOSING_OUTCOMES, callOutcome, fromIstInput, isCallOutcome, statusAfterCall, waHref } from "@/lib/admin/crm-meta";
import { createLead, leadSchema, normalizePhone } from "@/lib/crm";
import { button as mailButton, detailsTable, layout, sendMail, siteUrl } from "@/lib/mail";
import { hasServiceRole, supabaseAdmin } from "@/lib/supabase/admin";

type Db = Awaited<ReturnType<typeof requireStaff>>["db"];

export type LeadActionResult = ActionResult & { id?: string };

const isStatus = (v: string): v is LeadStatus => LEAD_STATUSES.some((s) => s.value === v);

/** Load a lead the current staff member may act on (RLS hides other agents' leads). */
async function loadLead(db: Db, staff: Staff, id: string) {
  if (!id) return null;
  let q = db.from("leads").select("id, ref, name, phone, interest, budget, status, assigned_to, follow_up_at").eq("id", id);
  if (staff.role !== "admin") q = q.eq("assigned_to", staff.id);
  const { data } = await q.maybeSingle();
  return data as { id: string; ref: number; name: string; phone: string; interest: string; budget: string | null; status: LeadStatus; assigned_to: string | null; follow_up_at: string | null } | null;
}

const notFound = () => fail("Lead not found, or it isn't assigned to you.");
const nowIso = () => new Date().toISOString();

async function logActivity(db: Db, staff: Staff, leadId: string, kind: string, body: string | null, data: Record<string, unknown> = {}) {
  const { error } = await db.from("lead_activities").insert({ lead_id: leadId, actor: staff.id, kind, body, data });
  if (error) console.error("[crm] activity insert failed:", error.message);
}

/* ---------------------------------------------------------------- status */

export async function setLeadStatus(fd: FormData): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  const status = text(fd, "status");
  if (!isStatus(status)) return fail("Pick a valid status");
  const lead = await loadLead(db, staff, text(fd, "id"));
  if (!lead) return notFound();
  if (lead.status === status) return ok(`Already ${leadStatus(status).label}`);

  const patch: Record<string, unknown> = { status, last_activity_at: nowIso() };
  if (status === "won" || status === "lost") patch.follow_up_at = null;
  const { error } = await db.from("leads").update(patch).eq("id", lead.id);
  if (error) return fail(error.message);
  await logActivity(db, staff, lead.id, "status", null, { from: lead.status, to: status });
  refresh();
  return ok(`L-${lead.ref} moved to ${leadStatus(status).label}`);
}

/* ---------------------------------------------------------------- assignment */

export async function assignLead(fd: FormData): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  if (staff.role !== "admin") return fail("Only admins can assign leads.");
  const lead = await loadLead(db, staff, text(fd, "id"));
  if (!lead) return notFound();
  const to = text(fd, "assigned_to") || null;
  if (to === lead.assigned_to) return ok("No change");

  let exec: { id: string; full_name: string; email: string; active: boolean } | null = null;
  if (to) {
    const { data } = await db.from("profiles").select("id, full_name, email, active").eq("id", to).maybeSingle();
    if (!data?.active) return fail("That team member doesn't have access any more.");
    exec = data;
  }

  const { error } = await db.from("leads").update({ assigned_to: to, last_activity_at: nowIso() }).eq("id", lead.id);
  if (error) return fail(error.message);
  await logActivity(db, staff, lead.id, "assigned", null, { from: lead.assigned_to, to });

  let emailed = false;
  if (exec && exec.id !== staff.id && exec.email) {
    emailed = await emailAssignment(lead, exec, staff);
    if (emailed) await logActivity(db, staff, lead.id, "email", `Assignment email sent to ${exec.email}`, { to: exec.email, template: "assigned" });
  }
  refresh();
  const who = exec ? exec.full_name || exec.email : null;
  return ok(who ? `Assigned to ${who}${emailed ? " · email sent" : ""}` : "Lead unassigned");
}

/** Tell the executive about their new lead. Never throws (SMTP may be missing). */
async function emailAssignment(lead: NonNullable<Awaited<ReturnType<typeof loadLead>>>, exec: { full_name: string; email: string }, by: Staff) {
  try {
    const url = `${siteUrl()}/admin/leads/${lead.id}`;
    const body =
      `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hi ${exec.full_name.split(" ")[0] || "there"}, ${by.fullName} has assigned you a lead. Please call within the hour.</p>` +
      detailsTable([
        ["Lead", `L-${lead.ref}`],
        ["Name", lead.name],
        ["Phone", lead.phone],
        ["Interested in", lead.interest],
        ["Budget", lead.budget],
      ]) +
      mailButton(url, "Open lead in CRM") +
      `<p style="margin:12px 0 0;font-size:13px"><a href="${waHref(lead.phone)}" style="color:#b8893b">WhatsApp ${lead.name.split(" ")[0]} →</a></p>`;
    return await sendMail({
      to: exec.email,
      subject: `New lead assigned: ${lead.name} · ${lead.interest} (L-${lead.ref})`,
      html: layout("A new lead is waiting for you", body, await getSiteSettings()),
    });
  } catch (err) {
    console.error("[crm] assignment email failed:", err);
    return false;
  }
}

/* ---------------------------------------------------------------- follow-up */

export async function setFollowUp(fd: FormData): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  const lead = await loadLead(db, staff, text(fd, "id"));
  if (!lead) return notFound();
  const raw = text(fd, "follow_up_at");
  const at = fromIstInput(raw);
  if (raw && !at) return fail("Pick a valid date and time");

  const { error } = await db.from("leads").update({ follow_up_at: at, last_activity_at: nowIso() }).eq("id", lead.id);
  if (error) return fail(error.message);
  await logActivity(db, staff, lead.id, "follow_up", null, { at });
  refresh();
  return ok(at ? "Follow-up scheduled" : "Follow-up cleared");
}

/* ---------------------------------------------------------------- call log & notes */

export async function logCall(fd: FormData): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  const outcome = text(fd, "outcome");
  if (!isCallOutcome(outcome)) return fail("Choose how the call went", { outcome: "Choose an outcome" });
  const notes = text(fd, "notes").slice(0, 2000);
  const raw = text(fd, "follow_up_at");
  const at = fromIstInput(raw);
  if (raw && !at) return fail("Pick a valid follow-up time", { follow_up_at: "Invalid date" });

  const lead = await loadLead(db, staff, text(fd, "id"));
  if (!lead) return notFound();

  const next = statusAfterCall(outcome, lead.status);
  const after = next ?? lead.status;
  const closed = after === "won" || after === "lost" || CLOSING_OUTCOMES.includes(outcome);
  const patch: Record<string, unknown> = { follow_up_at: closed ? null : at, last_activity_at: nowIso() };
  if (next) patch.status = next;

  const { error } = await db.from("leads").update(patch).eq("id", lead.id);
  if (error) return fail(error.message);
  await logActivity(db, staff, lead.id, "call", notes || null, { outcome, ...(next ? { status: { from: lead.status, to: next } } : {}), follow_up_at: patch.follow_up_at });
  if (next) await logActivity(db, staff, lead.id, "status", null, { from: lead.status, to: next, via: "call" });
  refresh();
  return ok(`Call logged: ${callOutcome(outcome).label}${next ? ` · now ${leadStatus(next).label}` : ""}`);
}

export async function addNote(fd: FormData): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  const body = text(fd, "body").slice(0, 2000);
  if (body.length < 2) return fail("Write a note first", { body: "Write a note first" });
  const lead = await loadLead(db, staff, text(fd, "id"));
  if (!lead) return notFound();
  const { error } = await db.from("lead_activities").insert({ lead_id: lead.id, actor: staff.id, kind: "note", body, data: {} });
  if (error) return fail(error.message);
  await db.from("leads").update({ last_activity_at: nowIso() }).eq("id", lead.id);
  refresh();
  return ok("Note added");
}

/* ---------------------------------------------------------------- manual entry */

export async function createManualLead(fd: FormData): Promise<LeadActionResult> {
  const { staff, db } = await requireStaff();
  const parsed = leadSchema.safeParse({
    name: text(fd, "name"),
    phone: text(fd, "phone"),
    email: text(fd, "email"),
    interest: text(fd, "interest") || "Other",
    budget: text(fd, "budget") || undefined,
    message: text(fd, "message") || undefined,
    source: text(fd, "source") || "Phone call",
  });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const input = parsed.data;

  const raw = text(fd, "follow_up_at");
  const followUp = fromIstInput(raw);
  if (raw && !followUp) return fail("Pick a valid follow-up time", { follow_up_at: "Invalid date" });
  // Agents always own what they enter; admins choose (blank = unassigned).
  const owner = staff.role === "admin" ? text(fd, "assigned_to") || null : staff.id;

  let id: string;
  let ref: string;
  let duplicate = false;
  try {
    if (hasServiceRole()) {
      const res = await createLead(input, { channel: "manual", meta: { created_by: staff.id } });
      ({ id, ref, duplicate } = res);
    } else {
      if (staff.role !== "admin") return fail("Ask an admin to add this lead (service role key not configured).");
      ({ id, ref } = await insertDirect(db, input, staff));
    }
  } catch (err) {
    console.error("[crm] manual lead failed:", err);
    return fail("Could not save the lead. Please try again.");
  }

  const writer = hasServiceRole() ? supabaseAdmin() : db;
  if (followUp) {
    const { error } = await writer.from("leads").update({ follow_up_at: followUp }).eq("id", id);
    if (error) console.error("[crm] manual lead follow-up failed:", error.message);
  }
  let assigned = false;
  if (owner) {
    // A merged enquiry keeps its existing owner; only claim it when nobody has it yet.
    let q = writer.from("leads").update({ assigned_to: owner }).eq("id", id);
    if (duplicate) q = q.is("assigned_to", null);
    const { data, error } = await q.select("id");
    if (error) console.error("[crm] manual lead assign failed:", error.message);
    assigned = Boolean(data?.length);
  }
  if (assigned && staff.role === "admin" && owner !== staff.id) {
    await writer.from("lead_activities").insert({ lead_id: id, actor: staff.id, kind: "assigned", data: { from: null, to: owner } });
  }
  refresh();
  return { ok: true, id, message: duplicate ? `Matched existing lead ${ref} — enquiry added to it` : `Lead ${ref} created` };
}

/** Fallback when there's no service role (e.g. demo mode): insert with the admin's own session. */
async function insertDirect(db: Db, input: ReturnType<typeof leadSchema.parse>, staff: Staff) {
  const { data, error } = await db
    .from("leads")
    .insert({
      name: input.name,
      phone: input.phone,
      phone_norm: normalizePhone(input.phone),
      email: input.email || null,
      interest: input.interest,
      budget: input.budget || null,
      message: input.message || null,
      source: input.source,
      channel: "manual",
      utm: {},
      meta: { created_by: staff.id },
    })
    .select("id, ref")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  await db.from("lead_activities").insert({ lead_id: data.id, actor: staff.id, kind: "created", body: `Added manually (${input.source})`, data: {} });
  return { id: data.id as string, ref: `L-${data.ref}` };
}
