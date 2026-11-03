/**
 * Offer dates are entered and shown in India time (IST, UTC+05:30, no DST), so the
 * admin form renders identically on the server and in the browser.
 */
const IST_OFFSET_MS = 330 * 60_000;

/** ISO timestamp → value for <input type="datetime-local"> in IST. */
export function toIstInput(iso: string | null | undefined) {
  if (!iso) return "";
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-10-21T18:30" (IST) → ISO timestamp, or null when invalid. */
export function fromIstInput(v: string) {
  const t = Date.parse(`${v.length === 16 ? `${v}:00` : v}+05:30`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** "21 Oct 2026, 6:30 pm" in IST. */
export function formatIst(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
