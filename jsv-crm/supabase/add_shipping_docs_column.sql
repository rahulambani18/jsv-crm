-- Adds shipping-document tracking to Orders: a checklist of Invoice,
-- LR Copy, E-way Bill, and POD, shown once an order is Dispatched or
-- Delivered. Run this once in the Supabase SQL Editor.

alter table orders
  add column if not exists shipping_docs jsonb not null default '{"invoice": false, "lrCopy": false, "eway": false, "pod": false}'::jsonb;
