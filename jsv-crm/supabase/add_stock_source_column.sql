-- Run this in Supabase SQL Editor. Adds a `source` column to `stock`
-- so the Inventory page can show whether a row's quantity was last
-- set by a person (Stock Entry / manual edit), the "Import Excel/CSV"
-- button, or the excel-stock-sync-agent running automatically.

alter table stock add column if not exists source text default 'Manual';

-- Existing rows predate this column — label them Manual since that's
-- how they were entered before this feature existed.
update stock set source = 'Manual' where source is null;
