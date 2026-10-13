import "server-only";
import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { site, type SiteSettings } from "@/lib/site";

/**
 * Gmail SMTP mailer. Needs an App Password (Google Account → Security →
 * 2-Step Verification → App passwords). Gmail caps sending at ~500 mails/day,
 * which is plenty for alerts and auto-replies.
 */
let transporter: Transporter | null = null;

export const isMailConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export const notifyRecipients = () =>
  (process.env.LEAD_NOTIFY_TO ?? process.env.SMTP_USER ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export async function sendMail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string; attachments?: SendMailOptions["attachments"] }) {
  if (!isMailConfigured()) {
    console.info(`[mail] SMTP not configured — skipped "${opts.subject}"`);
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: `"${process.env.MAIL_FROM_NAME ?? site.name}" <${process.env.SMTP_USER}>`,
      ...opts,
    });
    return true;
  } catch (err) {
    console.error("[mail] send failed:", err);
    return false;
  }
}

/* ---------------------------------------------------------------- templates */

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Minimal, email-client-safe wrapper (tables + inline styles). */
export function layout(title: string, body: string, s: Pick<SiteSettings, "address" | "phone">) {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#1d1b18">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1f2a24;color:#f6f3ee;padding:20px 28px;font-size:18px;font-weight:bold">${esc(site.fullName)}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px;background:#faf8f4;color:#7a746b;font-size:12px">${esc(s.address)} · ${esc(s.phone)}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Two-column key/value table; empty values are skipped. */
export function detailsTable(rows: [string, unknown][]) {
  const tr = rows
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;color:#7a746b;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:8px 0;font-size:14px">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #eee">${tr}</table>`;
}

export function button(href: string, label: string) {
  return `<p style="margin:24px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#b8893b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;font-size:14px">${esc(label)}</a></p>`;
}

export { esc };
