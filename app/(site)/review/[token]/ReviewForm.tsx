"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { LoaderCircle, Star } from "lucide-react";
import { useState, useTransition } from "react";
import { submitReview } from "../actions";

const LABELS = ["", "Poor", "Could be better", "Good", "Very good", "Excellent!"];

export function ReviewForm({ token, name, role }: { token: string; name: string; role: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const shown = hover || rating;

  if (done !== null) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
        <span className="text-4xl">🙏</span>
        <h2 className="mt-3 text-2xl text-ink">Thank you, {name.split(" ")[0]}!</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {done >= 4 ? "We're so glad we could help. Your review will appear on our website shortly." : "Thank you for being honest — our team will reach out to make things right."}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">
          Visit our website →
        </Link>
      </motion.div>
    );
  }

  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-red-600">{errors[k]}</span>;

  return (
    <form
      className="mt-6 grid gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("rating", String(rating));
        start(async () => {
          const res = await submitReview(fd);
          if (res.ok) return setDone(res.rating);
          setErrors(res.errors ?? {});
          setMessage(res.message);
        });
      }}
    >
      <input type="hidden" name="token" value={token} />

      <div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded-lg p-0.5 transition active:scale-90"
            >
              <Star className={`size-10 transition ${n <= shown ? "fill-accent text-accent" : "text-line"}`} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm font-medium text-accent-strong">{LABELS[shown]}</p>
        {err("rating")}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Your review</span>
        <textarea name="quote" rows={4} maxLength={1000} placeholder="What did we do well? How was the property search, loan or paperwork?" className="field resize-y" />
        {err("quote")}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Your name</span>
          <input name="name" defaultValue={name} className="field" />
          {err("name")}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Shown as</span>
          <input name="role" defaultValue={role} placeholder="e.g. Home buyer, Kanpur" className="field" />
        </label>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="consent" defaultChecked className="mt-0.5 size-4 accent-[var(--accent)]" />
        You can show my review and first name on your website.
      </label>

      {message && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{message}</p>}

      <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-accent-fg transition hover:brightness-105 disabled:opacity-60">
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        Submit review
      </button>
    </form>
  );
}
