"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function NewsletterForm() {
  const toast = useToast();
  const [email, setEmail] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!email) return;
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch(() => null);
        if (!res?.ok) {
          toast({ title: "Couldn't subscribe", text: "Please check the email address and try again." });
          return;
        }
        setEmail("");
        toast({ title: "You're subscribed", text: "We'll share rate drops and new listings." });
      }}
      className="flex w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1.5 pl-5 md:max-w-md"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        aria-label="Email address"
        className="min-w-0 flex-1 bg-transparent text-sm text-deep-fg placeholder:text-deep-fg/40 focus:outline-none"
      />
      <button
        aria-label="Subscribe"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition hover:scale-105"
      >
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
