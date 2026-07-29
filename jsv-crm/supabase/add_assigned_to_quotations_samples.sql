-- Run this in Supabase SQL Editor. Extends the "assigned to" field
-- (already on customers/orders, see add_assigned_to_column.sql) to
-- quotations and samples so their new "Assign" bulk action has
-- somewhere to save the assigned sales rep.

alter table quotations
  add column if not exists assigned_to text;

alter table samples
  add column if not exists assigned_to text;

alter table invoices
  add column if not exists assigned_to text;
