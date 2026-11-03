import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Plain, readable layout for Privacy Policy / Terms: title, date, numbered sections with a jump list. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: React.ReactNode; sections: { id: string; title: string; body: React.ReactNode }[] }) {
  return (
    <section className="container-app pt-24 pb-16 lg:pt-28">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-ink">{title}</span>
      </nav>
      <h1 className="mt-4 text-[clamp(2rem,5vw,3rem)] leading-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">Last updated: {updated}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <ol className="sticky top-28 grid gap-1 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 text-ink-soft transition hover:bg-subtle hover:text-ink">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </aside>
        <article className="max-w-3xl text-[15px] leading-relaxed text-ink-soft [&_a]:font-medium [&_a]:text-accent [&_a:hover]:underline [&_li]:mt-1.5 [&_strong]:text-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          <div className="grid gap-3">{intro}</div>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="mt-10 scroll-mt-28">
              <h2 className="font-sans text-lg font-semibold tracking-normal text-ink">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 grid gap-3">{s.body}</div>
            </section>
          ))}
        </article>
      </div>
    </section>
  );
}
