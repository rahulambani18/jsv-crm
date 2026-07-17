-- Run this in Supabase SQL Editor. Your role_permissions table was
-- missing a can_delete column entirely, which is why the "Delete"
-- checkbox on the Roles & Permissions screen never actually saved
-- anything (it had nowhere in the database to be stored).

alter table role_permissions
  add column if not exists can_delete boolean default false;
