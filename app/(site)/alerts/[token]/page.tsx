import type { Metadata } from "next";
import Link from "next/link";
import { Link2Off } from "lucide-react";
import { requirementRef, requirementSummary, type RequirementRow } from "@/lib/requirements";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { site } from "@/lib/site";
import { LogoMark } from "@/components/ui/BrandIcons";
import { AlertsToggle } from "./AlertsToggle";

export const metadata: Metadata = {
  title: "Property alerts",
  robots: { index: false, follow: false },
};

// Cache Components needs at least one param; real tokens render on demand.
export function generateStaticParams() {
  return [{ token: "_" }];
}

/** Opened from the "Stop alerts" link in requirement emails. */
export default async function AlertsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[\w-]{16,64}$/.test(token);
  const { data } = valid ? await supabaseAdmin().from("requirements").select("*").eq("token", token).maybeSingle() : { data: null };
  const r = data as RequirementRow | null;

  return (
    <section className="container-app flex min-h-[80dvh] items-start justify-center pt-24 pb-16 sm:pt-28">
      <div className="w-full max-w-lg rounded-[28px] border border-line bg-surface p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <LogoMark className="size-12" />
          <div>
            <p className="font-display text-lg leading-tight text-ink">{site.name}</p>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-soft uppercase">Property alerts</p>
          </div>
        </div>

        {!r ? (
          <div className="mt-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent-strong">
              <Link2Off className="size-6" />
            </span>
            <h1 className="mt-4 text-2xl text-ink">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-ink-soft">Please open the full link from our email, or message us and we&apos;ll update your alerts for you.</p>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">
              Visit our website →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-[1.7rem] leading-tight text-ink">Hi {r.name.split(" ")[0]}, manage your alerts</h1>
            <div className="mt-4 rounded-2xl border border-line bg-subtle/60 p-4">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase">Your requirement · {requirementRef(r.ref)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">{requirementSummary(r)}</p>
            </div>
            <AlertsToggle token={token} initial={r.alerts} hasEmail={Boolean(r.email)} />
          </>
        )}
      </div>
    </section>
  );
}
