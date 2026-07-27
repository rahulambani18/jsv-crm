-- The Quotations page saves each product row (product, qty, packingSize,
-- price) as a JSON array so the quote can show/edit line items, mirroring
-- how `orders.line_items` already works. The `quotations` table was
-- missing this column, which caused:
--   "Could not find the 'line_items' column of 'quotations' in the schema cache"
alter table quotations add column if not exists line_items jsonb default '[]';
