-- Adds a delivery/freight charge to orders, added at actual cost on top of
-- subtotal + GST (not itself taxed). Safe to run on an existing database.
alter table orders add column if not exists delivery_charge numeric default 0;
