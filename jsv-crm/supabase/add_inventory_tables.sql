-- Run this in Supabase SQL Editor. Adds the Inventory module: current
-- stock on hand per product/warehouse, plus a movement log so every
-- stock-in / stock-out is traceable.

create table if not exists stock (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  product text not null,
  warehouse text not null,
  unit text default 'kg',
  qty_on_hand numeric default 0,
  reorder_level numeric default 0,
  updated_at timestamptz default now(),
  unique (workspace_id, product, warehouse)
);

create table if not exists stock_movements (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  product text not null,
  warehouse text not null,
  type text not null,           -- Received | Dispatched | Adjustment | Return
  qty numeric not null,         -- always positive; `type` determines the sign of the effect
  reference text,               -- e.g. PO number, order number
  notes text,
  date date default current_date,
  created_by text,
  created_at timestamptz default now()
);

alter table stock enable row level security;
alter table stock_movements enable row level security;

drop policy if exists "stock read" on stock;
create policy "stock read" on stock for select using (auth.role() = 'authenticated');
drop policy if exists "stock write" on stock;
create policy "stock write" on stock for all using (auth.role() = 'authenticated');

drop policy if exists "stock_movements read" on stock_movements;
create policy "stock_movements read" on stock_movements for select using (auth.role() = 'authenticated');
drop policy if exists "stock_movements write" on stock_movements;
create policy "stock_movements write" on stock_movements for all using (auth.role() = 'authenticated');

-- Register the module + grant Admin/Sales Executive access, matching
-- the pattern used for the Invoices/Payments modules.
insert into modules (key, label) values
  ('inventory', 'Inventory')
on conflict (key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000002', 'inventory', true, true
on conflict (role_id, module_key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000003', 'inventory', true, false
on conflict (role_id, module_key) do nothing;
