-- Run this in Supabase SQL Editor. Adds a credit limit field to
-- customers so Customers -> Outstanding can flag accounts that are
-- over their agreed limit (computed live from invoices + payments,
-- not stored).

alter table customers
  add column if not exists credit_limit numeric default 0;
