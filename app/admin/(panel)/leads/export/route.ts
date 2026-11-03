import { requireAdmin } from "@/lib/admin/auth";
import { leadStatus } from "@/lib/admin/meta";
import { istDate } from "@/lib/admin/crm-meta";
import { applyLeadFilters, leadSort, parseFilters, staffMap, type LeadRow, type StaffLite } from "@/lib/admin/leads-query";

const CHUNK = 1000; // PostgREST's default max rows per request
const MAX_ROWS = 20000;

/** "2026-10-21 14:05" in IST — Excel parses this as a date-time. */
function ist(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${istDate(d)} ${time}`;
}

/** Quote every cell; neutralise formula injection (=, +, -, @) for spreadsheet apps. */
function cell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV of the leads list with the current filters applied (admin only). */
export async function GET(req: Request) {
  const { staff, db } = await requireAdmin();
  const f = parseFilters(new URL(req.url).searchParams);
  const sort = leadSort(f);

  const rows: LeadRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += CHUNK) {
    const { data, error } = await applyLeadFilters(db.from("leads").select("*"), f, staff)
      .order(sort.column, { ascending: sort.ascending, nullsFirst: sort.nullsFirst })
      .range(from, from + CHUNK - 1);
    if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });
    rows.push(...((data ?? []) as LeadRow[]));
    if (!data || data.length < CHUNK) break;
  }

  const { data: profiles } = await db.from("profiles").select("id, full_name, email, role, active");
  const byId = staffMap(profiles as StaffLite[] | null);

  const head = [
    "Ref",
    "Name",
    "Phone",
    "Email",
    "Interest",
    "Budget",
    "Status",
    "Assigned to",
    "Next follow-up (IST)",
    "Source",
    "Channel",
    "Property",
    "Message",
    "Callback slot",
    "UTM source",
    "UTM medium",
    "UTM campaign",
    "Enquiries",
    "Created (IST)",
    "Last activity (IST)",
  ];
  const lines = rows.map((l) => {
    const owner = l.assigned_to ? byId.get(l.assigned_to) : undefined;
    const utm = l.utm ?? {};
    return [
      `L-${l.ref}`,
      l.name,
      l.phone,
      l.email,
      l.interest,
      l.budget,
      leadStatus(l.status).label,
      owner ? owner.full_name || owner.email : "",
      ist(l.follow_up_at),
      l.source,
      l.channel,
      l.property_id,
      l.message?.replace(/\r?\n/g, " "),
      l.callback_slot,
      utm.utm_source,
      utm.utm_medium,
      utm.utm_campaign,
      l.submissions,
      ist(l.created_at),
      ist(l.last_activity_at),
    ]
      .map(cell)
      .join(",");
  });

  // BOM so Excel opens UTF-8 (₹, Hindi names) correctly; CRLF line endings for Windows Excel.
  const csv = "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");
  const name = `leads-${f.status || "all"}-${istDate()}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
