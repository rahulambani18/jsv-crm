-- supabase/bootstrap.sql
-- Run this AFTER schema.sql. It adds a trigger so that the very first
-- person to sign up automatically gets:
--   - a new workspace
--   - an "Admin" role with full view+edit on every module
--   - their profile linked to both
--
-- Anyone who signs up after that first user gets a "Sales Executive"
-- role with sensible default permissions (view-only on most modules),
-- attached to the SAME workspace as the first user (so your whole team
-- shares one CRM).

create or replace function handle_new_user()
returns trigger as $$
declare
  ws_id uuid;
  existing_ws_id uuid;
  admin_role_id uuid;
  exec_role_id uuid;
  is_first_user boolean;
begin
  -- Is there already a workspace? If yes, join it. If no, this user creates one.
  select id into existing_ws_id from workspaces order by created_at asc limit 1;
  is_first_user := existing_ws_id is null;

  if is_first_user then
    insert into workspaces (name) values ('JSV CRM') returning id into ws_id;

    -- Admin role: full view + edit on every module
    insert into roles (workspace_id, name, is_system) values (ws_id, 'Admin', true) returning id into admin_role_id;
    insert into role_permissions (role_id, module_key, can_view, can_edit)
      select admin_role_id, key, true, true from modules;

    -- Default Sales Executive role: view+edit on day-to-day modules,
    -- view-only on Reports, no access to Users & Roles.
    insert into roles (workspace_id, name, is_system) values (ws_id, 'Sales Executive', true) returning id into exec_role_id;
    insert into role_permissions (role_id, module_key, can_view, can_edit) values
      (exec_role_id, 'dashboard', true, false),
      (exec_role_id, 'leads', true, true),
      (exec_role_id, 'follow_ups', true, true),
      (exec_role_id, 'customers', true, true),
      (exec_role_id, 'samples', true, true),
      (exec_role_id, 'quotations', true, true),
      (exec_role_id, 'orders', true, true),
      (exec_role_id, 'products', true, false),
      (exec_role_id, 'reports', true, false),
      (exec_role_id, 'users', false, false);

    insert into profiles (id, workspace_id, full_name, title, role_id)
      values (new.id, ws_id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'Admin', admin_role_id);
  else
    select id into exec_role_id from roles where workspace_id = existing_ws_id and name = 'Sales Executive' limit 1;
    insert into profiles (id, workspace_id, full_name, title, role_id)
      values (new.id, existing_ws_id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'Sales Executive', exec_role_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
