-- Run this in Supabase SQL Editor. Adds an "archived" flag to stock
-- so discontinued/obsolete stock lines can be hidden from the active
-- Inventory view (via the new bulk "Archive" action) without deleting
-- their movement history, the way "Delete" does.

alter table stock
  add column if not exists archived boolean default false;

update stock set archived = false where archived is null;
