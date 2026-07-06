-- supabase/operations_tables.sql
-- Run this in Supabase SQL Editor to add Tasks, Meetings, Documents tables.
-- Safe to re-run — all statements use "if not exists".

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  title text not null,
  description text,
  type text default 'Call',
  priority text default 'Medium',
  status text default 'Pending',
  assigned_to text,
  related_to text,
  due_date date,
  created_at timestamptz default now()
);

create table if not exists meetings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  title text not null,
  type text default 'Customer Visit',
  status text default 'Scheduled',
  date date,
  time text,
  duration text,
  location text,
  attendees text,
  company text,
  contact text,
  agenda text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  name text not null,
  type text default 'COA',
  related_to text,
  company text,
  file_url text,
  notes text,
  created_at timestamptz default now()
);

-- RLS policies
alter table tasks enable row level security;
alter table meetings enable row level security;
alter table documents enable row level security;

drop policy if exists "tasks read" on tasks;
create policy "tasks read" on tasks for select using (auth.role() = 'authenticated');
drop policy if exists "tasks write" on tasks;
create policy "tasks write" on tasks for all using (auth.role() = 'authenticated');

drop policy if exists "meetings read" on meetings;
create policy "meetings read" on meetings for select using (auth.role() = 'authenticated');
drop policy if exists "meetings write" on meetings;
create policy "meetings write" on meetings for all using (auth.role() = 'authenticated');

drop policy if exists "documents read" on documents;
create policy "documents read" on documents for select using (auth.role() = 'authenticated');
drop policy if exists "documents write" on documents;
create policy "documents write" on documents for all using (auth.role() = 'authenticated');

-- Add new modules to the modules table
insert into modules (key, label) values
  ('tasks', 'Tasks'),
  ('meetings', 'Meetings'),
  ('documents', 'Documents')
on conflict (key) do nothing;

-- Grant Admin and Sales Executive access to new modules
insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000002', key, true, true
from (values ('tasks'), ('meetings'), ('documents')) as m(key)
on conflict (role_id, module_key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000003', key, true, true
from (values ('tasks'), ('meetings'), ('documents')) as m(key)
on conflict (role_id, module_key) do nothing;
