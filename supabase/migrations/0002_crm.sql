-- =============================================================================
-- Sales CRM: call logs, follow-ups, team performance.
-- Safe to run more than once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Indexes for the CRM screens
-- ---------------------------------------------------------------------------
-- Team performance ("calls this week") and activity feeds by kind.
create index if not exists lead_activities_kind_idx  on lead_activities (kind, created_at desc);
create index if not exists lead_activities_actor_idx on lead_activities (actor, created_at desc) where actor is not null;

-- Follow-ups page: open leads by owner, ordered by due time.
create index if not exists leads_owner_followup_idx on leads (assigned_to, follow_up_at)
  where follow_up_at is not null and status not in ('won', 'lost');

-- Leads list filters / sorts.
create index if not exists leads_created_idx       on leads (created_at desc);
create index if not exists leads_last_activity_idx on leads (last_activity_at desc);
create index if not exists leads_interest_idx      on leads (interest, created_at desc);
create index if not exists leads_source_idx        on leads (source, created_at desc);

-- Case-insensitive name search (ilike '%x%').
create extension if not exists pg_trgm;
create index if not exists leads_name_trgm_idx on leads using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Keep leads.last_activity_at fresh whenever something is logged.
-- (The app also sets it; this covers webhooks / SQL edits.)
-- ---------------------------------------------------------------------------
create or replace function touch_lead_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update leads set last_activity_at = greatest(last_activity_at, new.created_at) where id = new.lead_id;
  return new;
end $$;

drop trigger if exists lead_activities_touch on lead_activities;
create trigger lead_activities_touch after insert on lead_activities
  for each row execute function touch_lead_activity();

-- ---------------------------------------------------------------------------
-- RLS additions
-- ---------------------------------------------------------------------------
-- Agents already read/update their own leads (status, follow_up_at, notes) via 0001.
-- Let agents add walk-in / phone leads that they own (manual entry without the service role).
drop policy if exists "agent insert own leads" on leads;
create policy "agent insert own leads" on leads for insert
  with check (is_staff() and assigned_to = auth.uid() and channel = 'manual');

-- Agents may not reassign: the 0001 update policy's WITH CHECK (assigned_to = auth.uid())
-- already enforces that a lead stays theirs after an update.
