-- Run this in Supabase SQL Editor. Adds the Warehouses module: a real
-- record per warehouse (address, manager, contact, capacity, status)
-- instead of the hardcoded location-name list Orders/Inventory used
-- before. The `name` column is the same string already used in
-- stock.warehouse and orders.warehouse, so nothing else breaks.

create table if not exists warehouses (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  name text not null,
  code text,
  type text default 'Own',        -- Own | Rented | 3PL
  address text,
  city text,
  state text,
  manager text,
  phone text,
  email text,
  capacity numeric,
  capacity_unit text default 'sq ft',
  status text default 'Active',   -- Active | Inactive
  notes text,
  created_at timestamptz default now(),
  unique (workspace_id, name)
);

alter table warehouses enable row level security;

drop policy if exists "warehouses read" on warehouses;
create policy "warehouses read" on warehouses for select using (auth.role() = 'authenticated');
drop policy if exists "warehouses write" on warehouses;
create policy "warehouses write" on warehouses for all using (auth.role() = 'authenticated');

-- Register the module + grant Admin/Sales Executive access, matching
-- the pattern used for the Inventory module.
insert into modules (key, label) values
  ('warehouses', 'Warehouses')
on conflict (key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000002', 'warehouses', true, true
on conflict (role_id, module_key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000003', 'warehouses', true, false
on conflict (role_id, module_key) do nothing;
