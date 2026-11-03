"use client";

import { Plus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { Sheet } from "@/components/ui/Sheet";
import { button } from "@/components/admin/ui";
import { LEAD_INTERESTS, MANUAL_SOURCES } from "@/lib/admin/crm-meta";
import { createManualLead } from "@/app/admin/(panel)/leads/actions";
import { FollowUpField } from "./CallLog";

type Mode = Parameters<typeof FollowUpField>[0]["mode"];

/** "Add lead" button + sheet for walk-ins and phone enquiries (channel: manual). */
export function AddLeadButton({ staff, isAdmin, selfId }: { staff: { id: string; name: string }[]; isAdmin: boolean; selfId: string }) {
  const [open, setOpen] = useState(false);
  const [follow, setFollow] = useState<{ value: string; mode: Mode }>({ value: "", mode: "none" });
  const created = useRef<string | null>(null);
  const router = useRouter();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={button("primary")}>
        <Plus className="size-4" /> Add lead
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Add a lead">
        <div className="p-5 sm:p-7">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Manual entry</p>
          <h2 className="mt-1 mb-5 pr-12 font-display text-2xl text-ink">Add a lead</h2>
          <ActionForm
            action={async (fd) => {
              const res = await createManualLead(fd);
              created.current = res.ok ? (res.id ?? null) : null;
              return res;
            }}
            onSuccess={() => {
              setOpen(false);
              setFollow({ value: "", mode: "none" });
              if (created.current) router.push(`/admin/leads/${created.current}`);
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Full name" name="name">
              <input name="name" autoComplete="off" className="field-sm" placeholder="e.g. Rakesh Gupta" />
            </Field>
            <Field label="Mobile" name="phone">
              <input name="phone" type="tel" inputMode="tel" className="field-sm" placeholder="98xxxxxxxx" />
            </Field>
            <Field label="Email (optional)" name="email">
              <input name="email" type="email" className="field-sm" />
            </Field>
            <Field label="Interested in" name="interest">
              <select name="interest" defaultValue="Buy Property" className="field-sm">
                {LEAD_INTERESTS.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </Field>
            <Field label="Budget (optional)" name="budget">
              <input name="budget" className="field-sm" placeholder="e.g. ₹60–75 L" />
            </Field>
            <Field label="Source" name="source">
              <select name="source" defaultValue="Phone call" className="field-sm">
                {MANUAL_SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            {isAdmin && (
              <Field label="Assign to" name="assigned_to" className="sm:col-span-2">
                <select name="assigned_to" defaultValue="" className="field-sm">
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.id === selfId ? " (me)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Requirement / notes" name="message" className="sm:col-span-2">
              <textarea name="message" rows={3} className="field-sm resize-y" placeholder="Locality, size, loan amount…" />
            </Field>
            <Field label="First follow-up" name="follow_up_at" className="sm:col-span-2">
              <FollowUpField value={follow.value} mode={follow.mode} onChange={(value, mode) => setFollow({ value, mode })} />
            </Field>
            <div className="flex justify-end sm:col-span-2">
              <SubmitButton className="h-10 w-full sm:w-auto">
                <UserPlus className="size-4" /> Save lead
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
      </Sheet>
    </>
  );
}
