"use client";

import { Check, Copy, LoaderCircle, Mail, Star } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { createReviewLink, emailReviewLink } from "@/app/admin/(panel)/leads/review-actions";
import { waHref } from "@/lib/admin/crm-meta";
import { useToast } from "@/components/ui/Toast";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { btn, button } from "@/components/admin/ui";

const WA_TEXT = (name: string, url: string) =>
  `Namaste ${name.split(" ")[0]} ji! 🙏 Congratulations, and thank you for choosing Shri Banke Bihari Finance & Real Estate.\n\nCould you spare one minute to rate your experience? It really helps other families.\n${url}`;

/**
 * "Ask for a review" on a Won lead: creates a private link once, then send it on
 * WhatsApp (opens chat with the message ready), by email, or copy it.
 */
export function ReviewRequest({
  leadId,
  name,
  phone,
  email,
  initialUrl,
  received,
}: {
  leadId: string;
  name: string;
  phone: string;
  email: string | null;
  initialUrl: string | null;
  received: { rating: number; approved: boolean } | null;
}) {
  const toast = useToast();
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [mailing, startMail] = useTransition();

  if (received) {
    return (
      <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        <p className="flex items-center gap-1.5 font-semibold">
          Review received
          <span className="flex">
            {Array.from({ length: received.rating }, (_, k) => (
              <Star key={k} className="size-3.5 fill-current" />
            ))}
          </span>
        </p>
        <p className="mt-1 text-xs">
          {received.approved ? "It's live on the website." : "Waiting for approval — "}
          {!received.approved && (
            <Link href="/admin/content?tab=testimonials" className="font-semibold underline">
              review &amp; publish
            </Link>
          )}
        </p>
      </div>
    );
  }

  const fd = () => {
    const f = new FormData();
    f.set("id", leadId);
    return f;
  };

  /** Make sure a link exists, then run `then` with it. */
  const withLink = (then: (u: string) => void) =>
    start(async () => {
      if (url) return then(url);
      const res = await createReviewLink(fd());
      if (!res.ok || !res.url) return toast({ title: res.message ?? "Couldn't create the link", tone: "error" });
      setUrl(res.url);
      then(res.url);
    });

  const sendWhatsApp = () =>
    withLink((u) => {
      window.open(waHref(phone, WA_TEXT(name, u)), "_blank", "noopener");
    });

  const copy = () =>
    withLink(async (u) => {
      try {
        await navigator.clipboard.writeText(u);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        toast({ title: "Copy failed — select the link and copy it", tone: "error" });
      }
    });

  const sendEmail = () =>
    startMail(async () => {
      const res = await emailReviewLink(fd());
      toast({ title: res.message ?? (res.ok ? "Sent" : "Couldn't send"), tone: res.ok ? "success" : "error" });
    });

  return (
    <div className="grid gap-3">
      <p className="text-xs text-ink-soft">Deal closed — ask {name.split(" ")[0]} to rate their experience. Approved reviews show on the homepage with a “Verified buyer” badge.</p>
      <button onClick={sendWhatsApp} disabled={pending} className={`${btn.base} h-9 w-full px-4 text-sm bg-wa text-white hover:bg-wa/90`}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <WhatsAppIcon className="size-4" />}
        Send review link on WhatsApp
      </button>
      <div className="flex gap-2">
        <button onClick={copy} disabled={pending} className={button("outline", "flex-1")}>
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        {email && (
          <button onClick={sendEmail} disabled={mailing} className={button("outline", "flex-1")} title={`Email ${email}`}>
            {mailing ? <LoaderCircle className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Email
          </button>
        )}
      </div>
      {url && <p className="truncate rounded-lg bg-subtle px-2.5 py-1.5 font-mono text-[11px] text-ink-soft">{url}</p>}
    </div>
  );
}
