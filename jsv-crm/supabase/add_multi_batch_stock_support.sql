-- Run this in Supabase SQL Editor AFTER add_batch_barcode_and_stock_allocation_columns.sql.
--
-- That migration added batch_number/lot_number/manufacturing_date/
-- barcode/damaged_qty/reserved_qty columns, but `stock` still only
-- allowed ONE row per product+warehouse (see add_inventory_tables.sql's
-- `unique (workspace_id, product, warehouse)`), so a product could only
-- ever have a single "current" batch per warehouse — a new Received
-- entry overwrote the old batch's details rather than sitting
-- alongside it.
--
-- This migration removes that restriction so several batches of the
-- same product can genuinely coexist at the same warehouse (each with
-- its own batch number, lot number, mfg/expiry date, damaged/reserved
-- qty), which is what the Inventory page's batch-aware Stock Entry,
-- Transfer, and Excel import now expect.

alter table stock drop constraint if exists stock_workspace_id_product_warehouse_key;

-- Replaces it with a constraint that still stops the same batch number
-- being entered twice for the same product+warehouse by accident, while
-- allowing many different batch numbers to coexist. (Postgres treats
-- NULLs as distinct from each other in a unique index, so several
-- "no batch #" rows for the same product+warehouse can still coexist
-- too — the app always targets those by id, never by this constraint.)
create unique index if not exists stock_workspace_product_warehouse_batch_key
  on stock (workspace_id, product, warehouse, batch_number);

-- Speeds up the "find this exact batch" / "list all batches for this
-- product+warehouse" lookups Stock Entry, Transfer, and Excel import
-- all do now.
create index if not exists stock_product_warehouse_batch_idx
  on stock (product, warehouse, batch_number);
