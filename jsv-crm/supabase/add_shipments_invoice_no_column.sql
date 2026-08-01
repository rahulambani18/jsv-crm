-- Run this ONLY if you already ran add_shipments_table.sql before this fix
-- (i.e. your `shipments` table exists but is missing `invoice_no`).
-- If you haven't run add_shipments_table.sql yet, skip this — the
-- updated version of that file already includes the column.

alter table shipments add column if not exists invoice_no text;
