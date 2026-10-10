import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Compact image header used by inner pages. */
export function PageHero({
  eyebrow,
  title,
  text,
  image,
  crumb,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  text: string;
  image: string;
  crumb: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="container-app pt-20 lg:pt-24">
      <div className="relative overflow-hidden rounded-[32px] bg-deep text-deep-fg">
        <Image src={image} alt="" fill preload sizes="100vw" className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-deep via-deep/80 to-deep/20" />
        <div className="relative px-6 py-14 sm:px-12 sm:py-20">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-deep-fg/60">
            <Link href="/" className="hover:text-deep-fg">
              Home
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-deep-fg">{crumb}</span>
          </nav>
          <p className="eyebrow mt-6">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.08]">{title}</h1>
          <p className="mt-4 max-w-xl text-deep-fg/70 sm:text-lg">{text}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
