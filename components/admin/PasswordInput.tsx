"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/** Password field with a show / hide toggle. Takes the usual <input> props. */
export function PasswordInput({ className = "field-sm", ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;
  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-ink-soft hover:text-ink"
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
