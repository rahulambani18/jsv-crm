-- Run this in Supabase SQL Editor. The orders and customers tables were
-- missing several columns that the app's forms already collect, which is
-- why saving threw "Could not find the '<column>' column ... in the
-- schema cache" errors.

alter table customers
  add column if not exists business_type text;

alter table orders
  add column if not exists payment_terms text default 'Net 30',
  add column if not exists payment_due_date date,
  add column if not exists po_number text,
  add column if not exists po_date date,
  add column if not exists dispatch_date date;
