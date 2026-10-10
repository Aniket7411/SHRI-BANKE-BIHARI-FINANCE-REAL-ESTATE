import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type Variant = "solid" | "outline" | "ghost" | "light";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-tight transition-all duration-300 ease-app active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  solid: "bg-ink text-bg hover:bg-accent hover:text-accent-fg",
  outline: "border border-ink/25 text-ink hover:border-accent hover:text-accent",
  ghost: "text-ink hover:bg-subtle",
  light: "border border-white/40 text-white hover:bg-white hover:text-deep",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export function buttonClass(variant: Variant = "solid", size: Size = "md", className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

/** Small circular arrow that rotates on hover — the "thin arrow button" detail. */
function Arrow() {
  return (
    <span className="-mr-1.5 grid size-6 place-items-center rounded-full border border-current/30 transition-transform duration-300 ease-app group-hover/btn:rotate-45">
      <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
    </span>
  );
}

interface Common {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  icon?: ReactNode;
}

export function ButtonLink({
  variant,
  size,
  arrow,
  icon,
  className,
  children,
  ...rest
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

export function ButtonA({ variant, size, arrow, icon, className, children, ...rest }: Common & ComponentProps<"a">) {
  return (
    <a className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
      {arrow && <Arrow />}
    </a>
  );
}

export function Button({ variant, size, arrow, icon, className, children, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
      {arrow && <Arrow />}
    </button>
  );
}
