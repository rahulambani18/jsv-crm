-- Run this in Supabase SQL Editor. Adds an "assigned to" field to
-- customers and orders so the new "Assign" bulk action has somewhere
-- to save the assigned sales rep.

alter table customers
  add column if not exists assigned_to text;

alter table orders
  add column if not exists assigned_to text;
