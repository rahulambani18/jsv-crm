-- Run this in Supabase SQL Editor. Adds the `shipments` table backing
-- the Logistics module — standalone shipment/trip records that may
-- optionally reference an order (order_no), plus enough transporter/
-- freight fields to drive the Transporters ledger tab (freight_paid_by
-- + freight_payment_status + amount_paid track what's owed to each
-- transporter for "Us (Prepaid)" trips).

create table if not exists shipments (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  shipment_no text not null,
  order_no text,
  invoice_no text,
  company text,
  origin text,
  destination text,
  transporter text,
  vehicle_no text,
  driver_name text,
  driver_phone text,
  mode text default 'Road',
  lr_number text,
  dispatch_date date,
  expected_delivery date,
  actual_delivery date,
  status text default 'Pending',
  distance_km numeric,
  freight_cost numeric default 0,
  freight_paid_by text default 'Us (Prepaid)',
  freight_payment_status text default 'Unpaid',
  amount_paid numeric default 0,
  eway_bill_no text,
  notes text,
  created_at timestamptz default now()
);

alter table shipments enable row level security;
drop policy if exists "shipments read" on shipments;
create policy "shipments read" on shipments for select using (auth.role() = 'authenticated');
drop policy if exists "shipments write" on shipments;
create policy "shipments write" on shipments for all using (auth.role() = 'authenticated');

-- After running this, add a "Logistics" row to your roles' permissions
-- if you manage role_permissions rows manually — module_key: 'logistics'.
