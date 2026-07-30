-- Run this in Supabase SQL Editor. Adds columns to `invoices` so the
-- E-Invoice, E-Way Bill and Payment Link actions on the Invoices page
-- have somewhere to persist what they generate.
--
-- IMPORTANT: the E-Invoice (IRN) and E-Way Bill numbers produced by
-- this app are DEMO/PLACEHOLDER values generated client-side — they
-- are NOT issued by the GST Invoice Registration Portal (IRP) or the
-- E-Way Bill portal and are not legally valid tax documents. Wiring
-- this up to a real GSP (e.g. ClearTax, Cygnet, MasterGST) is a
-- separate integration — see src/lib/eInvoice.js and
-- src/lib/eWayBill.js for where the mock generation happens and
-- would be swapped for a real API call.

alter table invoices add column if not exists einvoice_irn text;
alter table invoices add column if not exists einvoice_ack_no text;
alter table invoices add column if not exists einvoice_ack_date timestamptz;
alter table invoices add column if not exists einvoice_qr text;

alter table invoices add column if not exists eway_bill_no text;
alter table invoices add column if not exists eway_valid_upto date;
alter table invoices add column if not exists eway_vehicle_no text;
alter table invoices add column if not exists eway_transporter text;
alter table invoices add column if not exists eway_transport_mode text;
alter table invoices add column if not exists eway_distance_km numeric;

alter table invoices add column if not exists upi_vpa text;
