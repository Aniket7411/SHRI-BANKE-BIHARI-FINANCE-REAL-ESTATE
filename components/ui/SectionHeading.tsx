import { Reveal } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  text?: string;
  align?: "left" | "center";
  className?: string;
}) {
  const center = align === "center";
  return (
    <Reveal className={`${center ? "mx-auto text-center" : ""} max-w-2xl ${className}`}>
      {eyebrow && (
        <span className="eyebrow">
          <span className="h-px w-6 bg-current" />
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-[clamp(1.8rem,3.8vw,2.9rem)] leading-[1.1] text-ink">{title}</h2>
      {text && <p className="mt-4 text-[15px] leading-relaxed text-ink-soft sm:text-base">{text}</p>}
    </Reveal>
  );
}
