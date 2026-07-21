-- Run this in Supabase SQL Editor. The stock table was created without
-- a created_at column, but the app sorts every table by created_at,
-- which is why Inventory failed with "column stock.created_at does
-- not exist".

alter table stock
  add column if not exists created_at timestamptz default now();
