-- supabase/schema.sql
-- Run this once in your Supabase project's SQL editor to provision the
-- full JSV CRM schema: roles & per-module permissions, leads, customers,
-- samples, quotations, line-item orders (with GST), products, follow-ups.
--
-- After running this, see src/lib/supabaseClient.js for the 2 env vars
-- you need to set to switch the app from demo data to this database.
--
-- SAFE TO RE-RUN: every statement is guarded with "if not exists" /
-- "drop policy if exists", so running this again won't error out or
-- duplicate anything.

-- ---------- extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- workspaces (multi-team support, optional) ----------
create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'JSV CRM',
  created_at timestamptz default now()
);

-- ---------- modules + roles + permissions ----------
-- Every page in the app is a "module". A role grants view/edit access
-- per module. This is what powers the Admin's "Users & Roles" screen.
create table if not exists modules (
  key text primary key,        -- e.g. 'leads', 'orders'
  label text not null          -- e.g. 'Leads', 'Orders'
);

insert into modules (key, label) values
  ('dashboard', 'Dashboard'),
  ('leads', 'Leads'),
  ('follow_ups', 'Follow-ups'),
  ('customers', 'Customers'),
  ('samples', 'Samples'),
  ('quotations', 'Quotations'),
  ('orders', 'Orders'),
  ('products', 'Products'),
  ('reports', 'Reports'),
  ('users', 'Users & Roles')
on conflict (key) do nothing;

create table if not exists roles (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,                    -- e.g. 'Admin', 'Sales Executive'
  is_system boolean default false,       -- true for the built-in Admin role (can't be deleted)
  created_at timestamptz default now(),
  unique (workspace_id, name)
);

create table if not exists role_permissions (
  role_id uuid references roles(id) on delete cascade,
  module_key text references modules(key) on delete cascade,
  can_view boolean default true,
  can_edit boolean default false,
  can_delete boolean default false,
  primary key (role_id, module_key)
);

-- ---------- profiles (one row per signed-in person) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  full_name text,
  title text default 'Sales Executive',  -- free-text job title shown in sidebar
  role_id uuid references roles(id),
  created_at timestamptz default now()
);

-- Client code can't query auth.users directly (admin-only table), but the
-- Users & Roles screen needs to show each person's email. This view joins
-- profiles to auth.users and is safe to expose read-only to any
-- authenticated user in the same way profiles already is.
create or replace view profiles_with_email
  with (security_invoker = true) as
  select p.id, p.workspace_id, p.full_name, p.title, p.role_id, p.created_at, u.email
  from profiles p
  join auth.users u on u.id = p.id;

grant select on profiles_with_email to authenticated;

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
  doc_url text,                    -- link to COA/MSDS/TDS document
  unit_price numeric default 0,    -- used to prefill order line items
  status text default 'Active',    -- Active | Inactive
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
  mobile text,
  email text,
  gst text,
  industry text,
  application text,
  products text[],
  qty text,
  city text,
  state text,
  billing_address text,
  shipping_address text,
  added date default current_date,
  created_at timestamptz default now()
);

create table if not exists samples (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  code text,
  company text not null,
  contact text,
  phone text,
  email text,
  products text[],
  qty text,
  sent date,
  courier text,
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

-- Orders now reference a customer and carry line items + GST as JSON,
-- so the order form can build up multiple product rows with live totals.
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  order_no text,
  customer_id uuid references customers(id),
  company text not null,
  warehouse text,
  order_date date,
  delivery date,
  line_items jsonb default '[]',   -- [{ product, qty, unit, unit_price, line_total }]
  subtotal numeric default 0,
  gst_rate numeric default 18,
  gst_amount numeric default 0,
  total numeric default 0,         -- subtotal + gst_amount
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

-- ---------- one-time setup: workspace + default roles ----------
-- This creates the single workspace this CRM runs in, plus the two
-- built-in roles (Admin: full access everywhere; Sales Executive:
-- can view everything but only edit the day-to-day sales modules).
-- Safe to re-run — "on conflict do nothing" skips it if already done.
insert into workspaces (id, name)
values ('00000000-0000-0000-0000-000000000001', 'JSV CRM')
on conflict (id) do nothing;

insert into roles (id, workspace_id, name, is_system)
values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Admin', true),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Sales Executive', true)
on conflict (workspace_id, name) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000002', key, true, true from modules
on conflict (role_id, module_key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000003', key, true,
  key not in ('products', 'reports', 'users', 'dashboard')
from modules
on conflict (role_id, module_key) do nothing;

-- ---------- row-level security ----------
alter table workspaces enable row level security;
alter table modules enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table leads enable row level security;
alter table customers enable row level security;
alter table samples enable row level security;
alter table quotations enable row level security;
alter table orders enable row level security;
alter table follow_ups enable row level security;

-- Modules is a small reference table — readable by anyone signed in.
drop policy if exists "modules read" on modules;
create policy "modules read" on modules for select using (auth.role() = 'authenticated');

-- Workspaces / roles / permissions / profiles: any authenticated user
-- can read AND write under the current policies below — simplest setup
-- for a small team where everyone is trusted. is_admin() is provided
-- as a ready-made building block if you later want to restrict writes
-- (e.g. roles/permissions) to Admins only at the database level; it
-- isn't wired into any policy yet.
create or replace function is_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1 from profiles p
    join roles r on r.id = p.role_id
    where p.id = uid and r.name = 'Admin'
  );
$$ language sql security definer;

drop policy if exists "workspace read" on workspaces;
create policy "workspace read" on workspaces for select using (auth.role() = 'authenticated');
drop policy if exists "workspace write" on workspaces;
create policy "workspace write" on workspaces for all using (auth.role() = 'authenticated');

drop policy if exists "roles read" on roles;
create policy "roles read" on roles for select using (auth.role() = 'authenticated');
drop policy if exists "roles write" on roles;
create policy "roles write" on roles for all using (auth.role() = 'authenticated');

drop policy if exists "perms read" on role_permissions;
create policy "perms read" on role_permissions for select using (auth.role() = 'authenticated');
drop policy if exists "perms write" on role_permissions;
create policy "perms write" on role_permissions for all using (auth.role() = 'authenticated');

drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select using (auth.role() = 'authenticated');
drop policy if exists "profiles write" on profiles;
create policy "profiles write" on profiles for all using (auth.role() = 'authenticated');

drop policy if exists "workspace read" on products;
create policy "workspace read" on products for select using (auth.role() = 'authenticated');
drop policy if exists "workspace write" on products;
create policy "workspace write" on products for all using (auth.role() = 'authenticated');

drop policy if exists "workspace read" on leads;
create policy "workspace read" on leads for select using (auth.role() = 'authenticated');
drop policy if exists "workspace write" on leads;
create policy "workspace write" on leads for all using (auth.role() = 'authenticated');

drop policy if exists "workspace read" on customers;
create policy "workspace read" on customers for select using (auth.role() = 'authenticated');
drop policy if exists "workspace write" on customers;
create policy "workspace write" on customers for all using (auth.role() = 'authenticated');

drop policy if exists "workspace read" on samples;
create policy "workspace read" on samples for select using (auth.role() = 'authenticated');
drop policy if exists "workspace write" on samples;
create policy "workspace write" on samples for all using (auth.role() = 'authenticated');

drop policy if exists "workspace read" on quotations;
create policy "workspace read" on quotations for select using (auth.role() = 'authenticated');
drop policy if exists "workspace write" on quotations;
create policy "workspace write" on quotations for all using (auth.role() = 'authenticated');

drop policy if exists "workspace read" on orders;
create policy "workspace read" on orders for select using (auth.role() = 'authenticated');
drop policy if exists "workspace write" on orders;
create policy "workspace write" on orders for all using (auth.role() = 'authenticated');

drop policy if exists "workspace read" on follow_ups;
create policy "workspace read" on follow_ups for select using (auth.role() = 'authenticated');
drop policy if exists "workspace write" on follow_ups;
create policy "workspace write" on follow_ups for all using (auth.role() = 'authenticated');
