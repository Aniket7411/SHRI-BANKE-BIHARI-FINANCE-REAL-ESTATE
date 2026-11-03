"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

/** Admin-only "executive" picker that sets ?owner= on the current page. */
export function OwnerFilter({ value, staff, selfId }: { value: string; staff: { id: string; name: string }[]; selfId: string }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  return (
    <span className="relative inline-flex">
      <select
        aria-label="Sales executive"
        value={value}
        disabled={pending}
        onChange={(e) => start(() => router.replace(e.target.value ? `${path}?owner=${e.target.value}` : path, { scroll: false }))}
        className="field-sm h-9 w-52 !py-0 pr-8 text-[13px]"
      >
        <option value="">Everyone</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id === selfId ? `${s.name} (me)` : s.name}
          </option>
        ))}
      </select>
      {pending && <LoaderCircle className="pointer-events-none absolute top-1/2 right-7 size-3.5 -translate-y-1/2 animate-spin text-ink-soft" />}
    </span>
  );
}
