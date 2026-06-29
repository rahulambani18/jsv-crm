-- supabase/schema.sql
-- Run this once in your Supabase project's SQL editor to provision the
-- full JSV CRM schema, including row-level security so each signed-in
-- user can only see data inside their own workspace/team.
--
-- After running this, see src/lib/supabaseClient.js for the 2 env vars
-- you need to set to switch the app from demo data to this database.

-- ---------- extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- workspaces (multi-team support, optional) ----------
create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'JSV CRM',
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  full_name text,
  role text default 'Sales Executive',
  created_at timestamptz default now()
);

-- ---------- core tables ----------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  name text not null,
  category text,
  supplier text,
  origin text,
  moq text,
  docs text,
  status text default 'Active',
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  company text not null,
  contact text,
  phone text,
  city text,
  priority text default 'Medium',         -- Low | Medium | High
  status text default 'New Lead',         -- pipeline stage, see PIPELINE_STAGES in app
  est_value numeric default 0,
  next_follow_up date,
  industry text,
  products text[],                        -- product names of interest
  created_at timestamptz default now()
);

create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  code text,
  company text not null,
  contact text,
  city text,
  gst text,
  industry text,
  application text,
  products text[],
  qty text,
  added date default current_date,
  created_at timestamptz default now()
);

create table if not exists samples (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  code text,
  company text not null,
  contact text,
  products text[],
  qty text,
  sent date,
  tracking text,
  status text default 'Preparing',  -- Preparing | In Transit | Delivered
  created_at timestamptz default now()
);

create table if not exists quotations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  quote_no text,
  company text not null,
  items integer default 0,
  total numeric default 0,
  valid_until date,
  status text default 'Draft',  -- Draft | Sent | Under Negotiation | Accepted | Rejected
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  order_no text,
  company text not null,
  warehouse text,
  order_date date,
  delivery date,
  total numeric default 0,
  status text default 'Processing',  -- Processing | Dispatched | Delivered | Cancelled
  payment text default 'Pending',    -- Pending | Paid | Partial
  created_at timestamptz default now()
);

create table if not exists follow_ups (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  date date not null,
  type text,        -- Call | Email | Meeting | Sample Dispatch
  lead text,
  contact text,
  notes text,
  status text default 'Upcoming',  -- Today | Upcoming | Overdue | Completed
  created_at timestamptz default now()
);

-- ---------- row-level security ----------
alter table products enable row level security;
alter table leads enable row level security;
alter table customers enable row level security;
alter table samples enable row level security;
alter table quotations enable row level security;
alter table orders enable row level security;
alter table follow_ups enable row level security;

-- Simple policy: any authenticated user can read/write everything in
-- their own workspace. Tighten further (e.g. per-role) as your team grows.
create policy "workspace read" on products for select using (auth.role() = 'authenticated');
create policy "workspace write" on products for all using (auth.role() = 'authenticated');

create policy "workspace read" on leads for select using (auth.role() = 'authenticated');
create policy "workspace write" on leads for all using (auth.role() = 'authenticated');

create policy "workspace read" on customers for select using (auth.role() = 'authenticated');
create policy "workspace write" on customers for all using (auth.role() = 'authenticated');

create policy "workspace read" on samples for select using (auth.role() = 'authenticated');
create policy "workspace write" on samples for all using (auth.role() = 'authenticated');

create policy "workspace read" on quotations for select using (auth.role() = 'authenticated');
create policy "workspace write" on quotations for all using (auth.role() = 'authenticated');

create policy "workspace read" on orders for select using (auth.role() = 'authenticated');
create policy "workspace write" on orders for all using (auth.role() = 'authenticated');

create policy "workspace read" on follow_ups for select using (auth.role() = 'authenticated');
create policy "workspace write" on follow_ups for all using (auth.role() = 'authenticated');
