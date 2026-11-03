import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Link2Off } from "lucide-react";
import { isOpen, type ReviewRequest } from "@/lib/reviews";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { site } from "@/lib/site";
import { LogoMark } from "@/components/ui/BrandIcons";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = {
  title: "Rate your experience",
  robots: { index: false, follow: false },
};

// Cache Components needs at least one param; real tokens render on demand.
export function generateStaticParams() {
  return [{ token: "_" }];
}

/** Private review page — opened from the link the team sends after a deal closes. */
export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[\w-]{16,64}$/.test(token);
  const { data } = valid ? await supabaseAdmin().from("review_requests").select("*").eq("token", token).maybeSingle() : { data: null };
  const req = data as ReviewRequest | null;
  const { data: property } = req?.property_id ? await supabaseAdmin().from("properties").select("title, locality, city").eq("id", req.property_id).maybeSingle() : { data: null };

  return (
    <section className="container-app flex min-h-[80dvh] items-start justify-center pt-24 pb-16 sm:pt-28">
      <div className="w-full max-w-lg rounded-[28px] border border-line bg-surface p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <LogoMark className="size-12" />
          <div>
            <p className="font-display text-lg leading-tight text-ink">{site.name}</p>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-soft uppercase">Finance &amp; Real Estate</p>
          </div>
        </div>

        {!req ? (
          <Notice icon={<Link2Off className="size-6" />} title="This link isn't valid" text="Please check you opened the full link we sent, or ask us for a new one." />
        ) : req.submitted_at ? (
          <Notice icon={<span className="text-2xl">🙏</span>} title={`Thank you, ${req.name.split(" ")[0]}!`} text="You've already shared your review. We truly appreciate it." />
        ) : !isOpen(req) ? (
          <Notice icon={<Clock className="size-6" />} title="This link has expired" text="Message us on WhatsApp and we'll send you a fresh one." />
        ) : (
          <>
            <h1 className="mt-6 text-[1.7rem] leading-tight text-ink">How was your experience, {req.name.split(" ")[0]}?</h1>
            <p className="mt-2 text-sm text-ink-soft">
              {property ? (
                <>
                  About <span className="font-medium text-ink">{property.title}</span>, {property.locality}
                  {property.city ? `, ${property.city}` : ""}.{" "}
                </>
              ) : null}
              It takes a minute and helps other families choose with confidence.
            </p>
            <ReviewForm token={token} name={req.name} role={req.role_hint} />
          </>
        )}
      </div>
    </section>
  );
}

function Notice({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="mt-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent-strong">{icon}</span>
      <h1 className="mt-4 text-2xl text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{text}</p>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">
        Visit our website →
      </Link>
    </div>
  );
}
