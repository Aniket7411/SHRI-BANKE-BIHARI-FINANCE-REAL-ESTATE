import { ButtonLink } from "@/components/ui/Button";
import { SiteChrome } from "@/components/layout/SiteChrome";

export default function NotFound() {
  return (
    <SiteChrome>
    <section className="container-app grid min-h-[70dvh] place-items-center pt-24 pb-16 text-center">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 text-[clamp(3rem,10vw,7rem)] leading-none text-ink">
          Lost your <em className="text-accent">way?</em>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">This page has moved or doesn&apos;t exist. Let&apos;s get you back home.</p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/" arrow>
            Back to home
          </ButtonLink>
          <ButtonLink href="/properties" variant="outline">
            Browse properties
          </ButtonLink>
        </div>
      </div>
    </section>
    </SiteChrome>
  );
}
