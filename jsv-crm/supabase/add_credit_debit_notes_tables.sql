-- Run this in Supabase SQL Editor. Adds Credit Note / Debit Note
-- records linked to an invoice — used by the "Credit Note" / "Debit
-- Note" row actions on the Invoices page (e.g. a rate difference,
-- return of goods, or a shortfall found after the original invoice
-- was raised).

create table if not exists credit_notes (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  note_no text not null,
  invoice_id uuid references invoices(id) on delete set null,
  invoice_no text,
  company text not null,
  date date not null default current_date,
  amount numeric not null default 0,
  reason text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists debit_notes (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  note_no text not null,
  invoice_id uuid references invoices(id) on delete set null,
  invoice_no text,
  company text not null,
  date date not null default current_date,
  amount numeric not null default 0,
  reason text,
  notes text,
  created_at timestamptz default now()
);

alter table credit_notes enable row level security;
drop policy if exists "credit_notes read" on credit_notes;
create policy "credit_notes read" on credit_notes for select using (auth.role() = 'authenticated');
drop policy if exists "credit_notes write" on credit_notes;
create policy "credit_notes write" on credit_notes for all using (auth.role() = 'authenticated');

alter table debit_notes enable row level security;
drop policy if exists "debit_notes read" on debit_notes;
create policy "debit_notes read" on debit_notes for select using (auth.role() = 'authenticated');
drop policy if exists "debit_notes write" on debit_notes;
create policy "debit_notes write" on debit_notes for all using (auth.role() = 'authenticated');
