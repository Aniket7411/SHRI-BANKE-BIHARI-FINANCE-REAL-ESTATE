"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import { createContext, useActionState, useContext, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/Toast";
import type { ActionResult } from "@/lib/admin/form";
import { button } from "./ui";

const ErrorsCtx = createContext<Record<string, string> | undefined>(undefined);

/**
 * <form> bound to a Server Action returning `ActionResult`.
 * Shows a toast with the result and exposes field errors to <Field>.
 */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
  onSuccess,
}: {
  action: (fd: FormData) => Promise<ActionResult | void>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (_: ActionResult | null, fd: FormData) => (await action(fd)) ?? null, null);

  useEffect(() => {
    if (!state) return;
    if (state.message) toast({ title: state.message, tone: state.ok ? "success" : "error" });
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      <ErrorsCtx value={state?.ok ? undefined : state?.errors}>{children}</ErrorsCtx>
    </form>
  );
}

export function Field({
  label,
  name,
  hint,
  className = "",
  children,
}: {
  label: string;
  name?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errors = useContext(ErrorsCtx);
  const error = name ? errors?.[name] : undefined;
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ children, variant = "primary", className = "" }: { children: React.ReactNode; variant?: "primary" | "outline" | "danger" | "ghost"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={button(variant, className)}>
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Small inline form for one-click actions (delete, toggle…) with an optional confirm prompt. */
export function ActionButton({
  action,
  fields,
  confirm,
  variant = "ghost",
  children,
  title,
}: {
  action: (fd: FormData) => Promise<ActionResult | void>;
  fields?: Record<string, string>;
  confirm?: string;
  variant?: "primary" | "outline" | "danger" | "ghost";
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <ActionForm action={action} className="inline">
      {Object.entries(fields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <ConfirmSubmit confirm={confirm} variant={variant} title={title}>
        {children}
      </ConfirmSubmit>
    </ActionForm>
  );
}

function ConfirmSubmit({ confirm, variant, title, children }: { confirm?: string; variant: "primary" | "outline" | "danger" | "ghost"; title?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      aria-label={title}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={button(variant)}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : children}
    </button>
  );
}

/** Tag-style list input. Submits a JSON array under `name`. */
export function ChipsInput({ name, defaultValue = [], placeholder = "Type and press Enter", suggestions = [] }: { name: string; defaultValue?: string[]; placeholder?: string; suggestions?: string[] }) {
  const [items, setItems] = useState(defaultValue);
  const [text, setText] = useState("");
  const add = (v: string) => {
    const t = v.trim();
    if (t && !items.includes(t)) setItems([...items, t]);
    setText("");
  };
  const unused = suggestions.filter((s) => !items.includes(s));
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <div className="field-sm flex flex-wrap items-center gap-1.5 !py-1.5">
        {items.map((i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-strong">
            {i}
            <button type="button" aria-label={`Remove ${i}`} onClick={() => setItems(items.filter((x) => x !== i))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && items.length) setItems(items.slice(0, -1));
          }}
          onBlur={() => text && add(text)}
          placeholder={items.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm outline-none"
        />
      </div>
      {unused.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unused.slice(0, 12).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-ink-soft hover:border-accent hover:text-accent">
              <Plus className="size-3" /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Textarea where each line becomes one list item. */
export function LinesInput({ name, defaultValue = [], rows = 4, placeholder }: { name: string; defaultValue?: string[]; rows?: number; placeholder?: string }) {
  return <textarea name={name} defaultValue={defaultValue.join("\n")} rows={rows} placeholder={placeholder ?? "One item per line"} className="field-sm resize-y" />;
}

export function Toggle({ name, defaultChecked, label, hint }: { name: string; defaultChecked?: boolean; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:bg-subtle">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-line transition peer-checked:bg-accent after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}
