-- Run this in Supabase SQL Editor. Adds the tables backing the
-- Purchase / Procurement module: a supplier master, purchase orders
-- (with embedded line_items + receipts jsonb, mirroring how orders
-- stores line_items), supplier bills, and supplier payments.
--
-- Goods receipt is tracked as a jsonb history array on the purchase
-- order itself (receipts) rather than a separate table — each entry
-- records what was received and when, and the UI derives per-line
-- received quantities and the PO's overall status from it. This keeps
-- the receiving flow to a single-table update, same trade-off the
-- app already makes for order line_items.

create table if not exists suppliers (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  code text,
  name text not null,
  contact text,
  phone text,
  email text,
  city text,
  state text,
  gst text,
  category text,
  payment_terms text default 'Net 30',
  notes text,
  status text default 'Active',
  added date default current_date,
  created_at timestamptz default now()
);

create table if not exists purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  po_no text not null,
  supplier_id uuid references suppliers(id),
  supplier text,
  warehouse text,
  order_date date,
  expected_delivery date,
  line_items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  gst_rate numeric default 18,
  gst_amount numeric default 0,
  total numeric default 0,
  status text default 'Draft',
  assigned_to text,
  notes text,
  receipts jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists supplier_bills (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  bill_no text not null,
  supplier_id uuid references suppliers(id),
  supplier text,
  po_id uuid references purchase_orders(id),
  po_no text,
  supplier_invoice_no text,
  bill_date date,
  due_date date,
  subtotal numeric default 0,
  gst_amount numeric default 0,
  total numeric default 0,
  amount_paid numeric default 0,
  status text default 'Unpaid',
  notes text,
  created_at timestamptz default now()
);

create table if not exists supplier_payments (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  payment_no text not null,
  bill_id uuid references supplier_bills(id),
  supplier text,
  amount numeric default 0,
  date date,
  mode text default 'NEFT',
  reference text,
  notes text,
  status text default 'Completed',
  created_at timestamptz default now()
);

alter table suppliers enable row level security;
drop policy if exists "suppliers read" on suppliers;
create policy "suppliers read" on suppliers for select using (auth.role() = 'authenticated');
drop policy if exists "suppliers write" on suppliers;
create policy "suppliers write" on suppliers for all using (auth.role() = 'authenticated');

alter table purchase_orders enable row level security;
drop policy if exists "purchase_orders read" on purchase_orders;
create policy "purchase_orders read" on purchase_orders for select using (auth.role() = 'authenticated');
drop policy if exists "purchase_orders write" on purchase_orders;
create policy "purchase_orders write" on purchase_orders for all using (auth.role() = 'authenticated');

alter table supplier_bills enable row level security;
drop policy if exists "supplier_bills read" on supplier_bills;
create policy "supplier_bills read" on supplier_bills for select using (auth.role() = 'authenticated');
drop policy if exists "supplier_bills write" on supplier_bills;
create policy "supplier_bills write" on supplier_bills for all using (auth.role() = 'authenticated');

alter table supplier_payments enable row level security;
drop policy if exists "supplier_payments read" on supplier_payments;
create policy "supplier_payments read" on supplier_payments for select using (auth.role() = 'authenticated');
drop policy if exists "supplier_payments write" on supplier_payments;
create policy "supplier_payments write" on supplier_payments for all using (auth.role() = 'authenticated');

-- After running this, add a "Purchases" row to your roles' permissions
-- if you manage role_permissions rows manually — module_key: 'purchases'.
