-- Run this in Supabase SQL Editor. This backs the real Audit Log tab
-- (Users & Roles -> Audit Log). The app previously "logged" actions
-- into the browser's localStorage, which meant the log only existed
-- on one device, reset whenever the cache was cleared, and hardcoded
-- the actor's name — it never actually recorded who did what.

create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  actor_email text,
  table_name text,
  action text,           -- 'Created' | 'Updated' | 'Deleted'
  record_label text,     -- best-effort human label, e.g. company/order name
  created_at timestamptz default now()
);

alter table audit_log enable row level security;

create policy "Authenticated users can read audit log"
on audit_log for select
to authenticated
using (true);

create policy "Authenticated users can write audit log"
on audit_log for insert
to authenticated
with check (true);
