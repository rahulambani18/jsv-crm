-- Run this in Supabase SQL Editor. Adds a column to track when an
-- invoice was last pushed out to Tally (via the "Export to Tally" button
-- on the Invoices page, and/or the tally-sync-agent's push mode), so an
-- invoice is never sent to Tally twice by accident.
-- Safe to re-run.

alter table invoices
  add column if not exists tally_synced_at timestamptz;
