import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoMark } from "@/components/ui/BrandIcons";
import { site } from "@/lib/site";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-subtle px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-12" />
          <p className="mt-3 font-display text-xl text-ink">{site.name}</p>
          <p className="text-xs tracking-[0.2em] text-ink-soft uppercase">Admin &amp; CRM</p>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
