-- Run this in Supabase SQL Editor. Fixes: "Could not find the
-- 'payment_terms' column of 'invoices' in the schema cache" —
-- your invoices/payments tables predate some columns being added to
-- create_invoices_and_payments_tables.sql. Every line below is
-- "add column if not exists", so it's safe to run even if some (or
-- all) of these columns already exist — nothing is overwritten.

alter table invoices add column if not exists invoice_no text;
alter table invoices add column if not exists company text;
alter table invoices add column if not exists order_id uuid references orders(id);
alter table invoices add column if not exists issue_date date;
alter table invoices add column if not exists due_date date;
alter table invoices add column if not exists payment_terms text default 'Net 30';
alter table invoices add column if not exists subtotal numeric default 0;
alter table invoices add column if not exists cgst numeric default 0;
alter table invoices add column if not exists sgst numeric default 0;
alter table invoices add column if not exists igst numeric default 0;
alter table invoices add column if not exists total numeric default 0;
alter table invoices add column if not exists status text default 'Draft';
alter table invoices add column if not exists payment_mode text;
alter table invoices add column if not exists notes text;
alter table invoices add column if not exists source text default 'Manual';

alter table payments add column if not exists payment_no text;
alter table payments add column if not exists company text;
alter table payments add column if not exists invoice_id uuid references invoices(id);
alter table payments add column if not exists amount numeric default 0;
alter table payments add column if not exists date date;
alter table payments add column if not exists mode text default 'NEFT';
alter table payments add column if not exists reference text;
alter table payments add column if not exists notes text;
alter table payments add column if not exists status text default 'Completed';

-- Nudge PostgREST to pick up the changes immediately instead of
-- waiting for its next automatic schema-cache refresh.
notify pgrst, 'reload schema';
