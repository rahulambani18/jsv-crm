-- Run this in Supabase SQL Editor. The Invoices and Payments pages in the
-- app were referencing tables that were never created, so both pages will
-- fail to load/save against a live Supabase database until this runs.
-- Safe to re-run — all statements use "if not exists".

create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  invoice_no text,
  company text not null,
  order_id uuid references orders(id),
  issue_date date,
  due_date date,
  payment_terms text default 'Net 30',
  subtotal numeric default 0,
  cgst numeric default 0,
  sgst numeric default 0,
  igst numeric default 0,
  total numeric default 0,
  status text default 'Draft',       -- Draft | Sent | Paid | Unpaid | Overdue | Cancelled
  payment_mode text,
  notes text,
  source text default 'Manual',      -- Manual | Tally Import | Tally Sync
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  payment_no text,
  company text not null,
  invoice_id uuid references invoices(id),
  amount numeric default 0,
  date date,
  mode text default 'NEFT',          -- NEFT | RTGS | Cheque | Cash | UPI | Bank Transfer
  reference text,
  notes text,
  status text default 'Completed',   -- Completed | Pending | Failed | Refunded
  created_at timestamptz default now()
);

-- RLS policies
alter table invoices enable row level security;
alter table payments enable row level security;

drop policy if exists "invoices read" on invoices;
create policy "invoices read" on invoices for select using (auth.role() = 'authenticated');
drop policy if exists "invoices write" on invoices;
create policy "invoices write" on invoices for all using (auth.role() = 'authenticated');

drop policy if exists "payments read" on payments;
create policy "payments read" on payments for select using (auth.role() = 'authenticated');
drop policy if exists "payments write" on payments;
create policy "payments write" on payments for all using (auth.role() = 'authenticated');

-- Register modules + grant Admin/Sales Executive access, matching the
-- pattern in operations_tables.sql
insert into modules (key, label) values
  ('invoices', 'Invoices'),
  ('payments', 'Payments')
on conflict (key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000002', key, true, true
from (values ('invoices'), ('payments')) as m(key)
on conflict (role_id, module_key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit)
select '00000000-0000-0000-0000-000000000003', key, true, true
from (values ('invoices'), ('payments')) as m(key)
on conflict (role_id, module_key) do nothing;
