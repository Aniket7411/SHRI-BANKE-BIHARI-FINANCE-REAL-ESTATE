import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Presentational building blocks for admin pages (server-safe). */

export function PageHeader({
  title,
  text,
  back,
  actions,
}: {
  title: string;
  text?: string;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink">
            <ChevronLeft className="size-3.5" /> {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl text-ink sm:text-3xl">{title}</h1>
        {text && <p className="mt-1 text-sm text-ink-soft">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, text, className = "", children, actions }: { title?: string; text?: string; className?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {text && <p className="mt-0.5 text-xs text-ink-soft">{text}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const tones = {
  neutral: "bg-subtle text-ink-soft",
  accent: "bg-accent-soft text-accent-strong",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  blue: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {text && <p className="mt-1 text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Table shell with horizontal scroll on small screens. */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-subtle text-[11px] tracking-wide text-ink-soft uppercase">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-3 align-middle";

export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition disabled:pointer-events-none disabled:opacity-60",
  primary: "h-9 px-4 text-sm bg-ink text-bg hover:bg-accent hover:text-accent-fg",
  outline: "h-9 px-4 text-sm border border-line text-ink hover:border-accent hover:text-accent",
  ghost: "h-8 px-3 text-[13px] text-ink-soft hover:bg-subtle hover:text-ink",
  danger: "h-8 px-3 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
};
export const button = (v: Exclude<keyof typeof btn, "base"> = "primary", extra = "") => `${btn.base} ${btn[v]} ${extra}`;

export function ButtonLink({ href, variant = "primary", children, className = "" }: { href: string; variant?: Exclude<keyof typeof btn, "base">; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={button(variant, className)}>
      {children}
    </Link>
  );
}
