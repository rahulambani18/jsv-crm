-- Run this in Supabase SQL Editor if you previously ran
-- add_warehouses_table.sql. It removes the standalone Warehouses
-- module (master list of warehouse records + its own page/nav item)
-- while keeping location tracking on stock and orders intact —
-- stock.warehouse and orders.warehouse are plain text columns, not
-- foreign keys into this table, so nothing else breaks.

delete from role_permissions where module_key = 'warehouses';
delete from modules where key = 'warehouses';

drop table if exists warehouses;
