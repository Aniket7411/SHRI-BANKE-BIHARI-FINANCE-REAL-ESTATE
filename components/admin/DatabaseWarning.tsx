import { TriangleAlert } from "lucide-react";

/** Admin → Settings: shown only while Supabase isn't connected on this server. */
export function DatabaseWarning() {
  return (
    <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold">Database not connected</p>
        <p className="mt-0.5 text-xs opacity-80">
          Supabase keys are missing on this server, so changes are only kept in a temporary local file and can be lost on redeploy. Add NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY to the server&apos;s environment variables and redeploy.
        </p>
      </div>
    </section>
  );
}
