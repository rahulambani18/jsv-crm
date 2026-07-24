-- Run this in Supabase SQL Editor. Adds expiry-date tracking to the
-- stock table so the Inventory page and Dashboard's "Expiry Products"
-- widget can flag batches that are expired or expiring soon.

alter table stock
  add column if not exists expiry_date date;
