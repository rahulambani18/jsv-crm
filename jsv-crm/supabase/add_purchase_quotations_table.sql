-- Run this in Supabase SQL Editor. Adds the `purchase_quotations` table
-- backing Purchases -> Quotations — one row per supplier's quote against
-- a requirement. Multiple rows sharing the same rfq_ref are responses to
-- the same RFQ and are what the "Compare" view lines up side by side.

create table if not exists purchase_quotations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  pq_no text not null,
  rfq_ref text not null,
  supplier_id uuid references suppliers(id),
  supplier text,
  quote_date date,
  valid_until date,
  line_items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  gst_rate numeric default 18,
  gst_amount numeric default 0,
  total numeric default 0,
  moq numeric,
  lead_time_days numeric,
  payment_terms text,
  status text default 'Received', -- Received | Selected | Rejected | Expired
  notes text,
  created_at timestamptz default now()
);

create index if not exists purchase_quotations_rfq_ref_idx on purchase_quotations(rfq_ref);

alter table purchase_quotations enable row level security;
drop policy if exists "purchase_quotations read" on purchase_quotations;
create policy "purchase_quotations read" on purchase_quotations for select using (auth.role() = 'authenticated');
drop policy if exists "purchase_quotations write" on purchase_quotations;
create policy "purchase_quotations write" on purchase_quotations for all using (auth.role() = 'authenticated');
