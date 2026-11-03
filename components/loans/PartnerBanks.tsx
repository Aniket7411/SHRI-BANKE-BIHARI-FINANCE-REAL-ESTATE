import type { Bank } from "@/lib/types";
import { Reveal } from "@/components/ui/Reveal";
import { BankLogo } from "./BankLogo";

/** Logo wall of the partner banks from Admin → Banks. Hidden until at least one bank is visible. */
export function PartnerBanks({ banks, compareHref, className = "" }: { banks: Bank[]; compareHref?: string; className?: string }) {
  if (!banks.length) return null;
  const government = banks.filter((b) => b.kind === "Government").length;
  return (
    <section className={`container-app py-12 sm:py-14 ${className}`}>
      <Reveal className="text-center">
        <p className="eyebrow">Our partner banks</p>
        <h2 className="mt-3 text-2xl text-ink sm:text-3xl">
          DSA for {banks.length} bank{banks.length === 1 ? "" : "s"}
          {government > 0 && <span className="text-ink-soft">, including {government} government bank{government === 1 ? "" : "s"}</span>}
        </h2>
      </Reveal>
      <ul className="mt-8 flex flex-wrap justify-center gap-3">
        {banks.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface py-2 pr-4 pl-2">
            <BankLogo bank={b} />
            <span className="text-sm font-medium text-ink">{b.name}</span>
          </li>
        ))}
      </ul>
      {compareHref && (
        <p className="mt-6 text-center">
          <a href={compareHref} className="text-sm font-medium text-accent hover:underline">
            Compare their rates →
          </a>
        </p>
      )}
    </section>
  );
}
