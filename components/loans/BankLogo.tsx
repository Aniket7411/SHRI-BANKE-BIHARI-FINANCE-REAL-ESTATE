import type { Bank } from "@/lib/types";

/** "HDFC Bank" → HDFC, "State Bank of India" → SBI, "Bank of Baroda" → BB. */
function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (/^[A-Z]{2,5}$/.test(words[0] ?? "")) return words[0]!;
  return (
    words
      .filter((w) => !/^(of|the|and|&)$/i.test(w))
      .slice(0, 3)
      .map((w) => w[0]!.toUpperCase())
      .join("") || name.slice(0, 2).toUpperCase()
  );
}

/** Bank logo on a white tile (logos are made for white), or the bank's initials when none is uploaded. */
export function BankLogo({ bank, size = "md" }: { bank: Pick<Bank, "name" | "logo">; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "size-9 rounded-lg text-[10px]", md: "size-11 rounded-xl text-xs", lg: "h-14 w-28 rounded-2xl text-sm" }[size];
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden border border-line bg-white font-semibold text-[#1f2a24] ${box}`}>
      {bank.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny admin-uploaded logos; no resizing needed
        <img src={bank.logo} alt={bank.name} loading="lazy" decoding="async" className="size-full object-contain p-1.5" />
      ) : (
        <span aria-label={bank.name}>{initials(bank.name)}</span>
      )}
    </span>
  );
}
