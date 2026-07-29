-- Run this in Supabase SQL Editor. Extends the Inventory module with:
--   * batch/lot tracking + manufacturing date on the current stock line
--     (mirrors how expiry_date already works: set on a "Received" entry,
--     carried forward until the next one)
--   * a barcode per stock line, for label printing / QR generation
--   * damaged_qty and reserved_qty, so qty_on_hand can be split into
--     what's actually sellable (available) vs damaged or earmarked for
--     a confirmed order

alter table stock
  add column if not exists batch_number text,
  add column if not exists lot_number text,
  add column if not exists manufacturing_date date,
  add column if not exists barcode text,
  add column if not exists damaged_qty numeric default 0,
  add column if not exists reserved_qty numeric default 0;

update stock set damaged_qty = 0 where damaged_qty is null;
update stock set reserved_qty = 0 where reserved_qty is null;

-- Same batch fields on the movement log, so a "Received" entry's batch
-- details stay attached to its own row in history — the stock table
-- only ever reflects the latest batch, but the log keeps every one.
alter table stock_movements
  add column if not exists batch_number text,
  add column if not exists lot_number text,
  add column if not exists manufacturing_date date;
