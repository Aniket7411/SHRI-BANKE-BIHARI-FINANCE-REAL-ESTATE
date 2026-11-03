"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / insecure contexts
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Coupon code chip with a copy button. */
export function CopyCode({ code, size = "md", className = "" }: { code: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const sizes = {
    sm: "h-6 gap-1 pl-2 pr-1.5 text-[11px]",
    md: "h-8 gap-1.5 pl-3 pr-2 text-xs",
    lg: "h-11 gap-2 pl-4 pr-3 text-sm",
  }[size];

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await copyText(code);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
          toast({ title: `Code ${code} copied`, text: "Mention it when you apply or share it on WhatsApp.", tone: "success" });
        } else {
          toast({ title: "Couldn't copy the code", text: `Please note it down: ${code}`, tone: "error" });
        }
      }}
      aria-label={`Copy code ${code}`}
      className={`inline-flex shrink-0 items-center rounded-full border border-dashed border-current/60 bg-white/10 font-mono font-semibold tracking-wider whitespace-nowrap transition hover:bg-white/20 active:scale-95 ${sizes} ${className}`}
    >
      {code}
      <span className="relative grid size-4 place-items-center">
        <AnimatePresence initial={false} mode="wait">
          <motion.span key={copied ? "y" : "n"} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.15 }}>
            {copied ? <Check className="size-3.5" strokeWidth={2.5} /> : <Copy className="size-3.5" />}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
