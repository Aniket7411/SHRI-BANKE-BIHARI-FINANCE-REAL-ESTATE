"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff, type Staff } from "@/lib/admin/auth";
import { fail, ok, text, type ActionResult } from "@/lib/admin/form";
import { ALERT_PROPERTY_COLUMNS, type AlertPropertyRow } from "@/lib/admin/requirements";
import { isMailConfigured } from "@/lib/mail";
import { isRequirementStatus, matchesRequirement, requirementRef, requirementStatus, type RequirementRow } from "@/lib/requirements";
import { sendPropertyAlertEmail } from "@/lib/requirements-server";

type Db = Awaited<ReturnType<typeof requireStaff>>["db"];

const nowIso = () => new Date().toISOString();

async function loadRequirement(db: Db, id: string) {
  if (!id) return null;
  const { data } = await db.from("requirements").select("*").eq("id", id).maybeSingle();
  return data as RequirementRow | null;
}

async function logOnLead(db: Db, staff: Staff, r: Pick<RequirementRow, "lead_id">, kind: string, body: string, data: Record<string, unknown> = {}) {
  if (!r.lead_id) return;
  const { error } = await db.from("lead_activities").insert({ lead_id: r.lead_id, actor: staff.id, kind, body, data });
  if (error) console.error("[requirements] activity insert failed:", error.message);
}

const notFound = () => fail("Requirement not found, or it isn't assigned to you.");

/* ---------------------------------------------------------------- status & alerts */

export async function setRequirementStatus(fd: FormData): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  const status = text(fd, "status");
  if (!isRequirementStatus(status)) return fail("Pick a valid status");
  const r = await loadRequirement(db, text(fd, "id"));
  if (!r) return notFound();
  if (r.status === status) return ok(`Already ${requirementStatus(status).label}`);
  const { error } = await db.from("requirements").update({ status }).eq("id", r.id);
  if (error) return fail(error.message);
  await logOnLead(db, staff, r, "note", `${requirementRef(r.ref)} marked ${requirementStatus(status).label}`);
  refresh();
  return ok(`${requirementRef(r.ref)} marked ${requirementStatus(status).label}`);
}

export async function setRequirementAlerts(fd: FormData): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  const r = await loadRequirement(db, text(fd, "id"));
  if (!r) return notFound();
  const alerts = text(fd, "alerts") === "true";
  const { error } = await db.from("requirements").update({ alerts }).eq("id", r.id);
  if (error) return fail(error.message);
  await logOnLead(db, staff, r, "note", `Alerts turned ${alerts ? "on" : "off"} for ${requirementRef(r.ref)}`);
  refresh();
  return ok(alerts ? "Alerts turned on" : "Alerts turned off");
}

export async function deleteRequirement(fd: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const id = text(fd, "id");
  const { error } = await db.from("requirements").delete().eq("id", id);
  if (error) return fail(error.message);
  redirect("/admin/requirements?deleted=1");
}

/* ---------------------------------------------------------------- sending alerts */

export type AlertOutcome = "sent" | "already" | "no_email" | "alerts_off" | "closed" | "no_match" | "failed" | "missing";

export interface SendAlertsResult extends ActionResult {
  outcomes: Record<string, AlertOutcome>;
  sent: number;
}

const OUTCOME_TEXT: Record<Exclude<AlertOutcome, "sent">, string> = {
  already: "already emailed",
  no_email: "no email address",
  alerts_off: "alerts turned off",
  closed: "requirement closed",
  no_match: "no longer matches",
  failed: "email failed",
  missing: "not found",
};

/**
 * Email one listing to the chosen requirements. Skips anyone without an email,
 * with alerts off, already emailed about this listing, or who no longer matches.
 */
export async function sendPropertyAlerts(propertyId: string, requirementIds: string[]): Promise<SendAlertsResult> {
  const { staff, db } = await requireAdmin();
  const ids = [...new Set(requirementIds)].slice(0, 200);
  const none = { outcomes: {}, sent: 0 };
  if (!ids.length) return { ...fail("Select at least one person to notify"), ...none };
  if (!isMailConfigured()) return { ...fail("Email isn't set up yet (SMTP settings missing). Use WhatsApp instead."), ...none };

  const { data: p } = await db.from("properties").select(ALERT_PROPERTY_COLUMNS).eq("id", propertyId).maybeSingle();
  const property = p as AlertPropertyRow | null;
  if (!property) return { ...fail("Property not found"), ...none };
  if (property.status !== "published") return { ...fail("Publish this property first — customers can't open a draft or sold listing."), ...none };

  const [{ data: reqs }, { data: logs }] = await Promise.all([
    db.from("requirements").select("*").in("id", ids),
    db.from("requirement_alerts").select("requirement_id").eq("property_id", propertyId).eq("channel", "email").in("requirement_id", ids),
  ]);
  const byId = new Map(((reqs ?? []) as RequirementRow[]).map((r) => [r.id, r]));
  const emailed = new Set((logs ?? []).map((l) => l.requirement_id as string));

  const outcomes: Record<string, AlertOutcome> = {};
  const toSend: RequirementRow[] = [];
  for (const id of ids) {
    const r = byId.get(id);
    outcomes[id] = !r
      ? "missing"
      : r.status === "closed"
        ? "closed"
        : !r.alerts
          ? "alerts_off"
          : !r.email
            ? "no_email"
            : emailed.has(id)
              ? "already"
              : !matchesRequirement(property, r)
                ? "no_match"
                : "sent";
    if (r && outcomes[id] === "sent") toSend.push(r);
  }

  // Gmail SMTP is happiest with a few connections at a time.
  for (let i = 0; i < toSend.length; i += 4) {
    await Promise.all(
      toSend.slice(i, i + 4).map(async (r) => {
        const okSent = await sendPropertyAlertEmail(r, { ...property, city: property.city ?? "" }).catch(() => false);
        if (!okSent) {
          outcomes[r.id] = "failed";
          return;
        }
        await db.from("requirement_alerts").upsert({ requirement_id: r.id, property_id: property.id, channel: "email", sent_by: staff.id }, { onConflict: "requirement_id,property_id,channel", ignoreDuplicates: true });
        await db.from("requirements").update({ last_notified_at: nowIso() }).eq("id", r.id);
        await logOnLead(db, staff, r, "email", `Property alert emailed: ${property.title}`, { to: r.email, template: "property_alert", property_id: property.id });
      }),
    );
  }

  const sent = Object.values(outcomes).filter((o) => o === "sent").length;
  const skipped = Object.entries(
    Object.values(outcomes)
      .filter((o): o is Exclude<AlertOutcome, "sent"> => o !== "sent")
      .reduce<Record<string, number>>((acc, o) => ((acc[OUTCOME_TEXT[o]] = (acc[OUTCOME_TEXT[o]] ?? 0) + 1), acc), {}),
  )
    .map(([why, n]) => `${n} ${why}`)
    .join(", ");
  refresh();

  if (!sent) return { ok: false, message: `No emails sent${skipped ? ` — ${skipped}` : ""}`, outcomes, sent };
  return { ok: true, message: `Alert emailed to ${sent} ${sent === 1 ? "person" : "people"}${skipped ? ` · skipped ${skipped}` : ""}`, outcomes, sent };
}

/** Record that a WhatsApp alert was sent by hand (the admin taps the wa.me link). */
export async function logWhatsAppAlert(propertyId: string, requirementId: string): Promise<ActionResult> {
  const { staff, db } = await requireStaff();
  const r = await loadRequirement(db, requirementId);
  if (!r) return notFound();
  const { data: p } = await db.from("properties").select("id, title").eq("id", propertyId).maybeSingle();
  if (!p) return fail("Property not found");
  const { error } = await db
    .from("requirement_alerts")
    .upsert({ requirement_id: r.id, property_id: p.id, channel: "whatsapp", sent_by: staff.id }, { onConflict: "requirement_id,property_id,channel", ignoreDuplicates: true });
  if (error) return fail(error.message);
  await db.from("requirements").update({ last_notified_at: nowIso() }).eq("id", r.id);
  await logOnLead(db, staff, r, "note", `Property shared on WhatsApp: ${p.title}`, { property_id: p.id, channel: "whatsapp" });
  refresh();
  return ok(`WhatsApp alert logged for ${r.name}`);
}
