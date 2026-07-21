-- add_user_permissions.sql
--
-- Per-user permission overrides, layered on top of role permissions.
--
-- Until now, access was purely role-based: every "Sales Executive" had
-- identical permissions. This table lets an Admin override view/edit/
-- delete for one specific person on one specific module, without
-- creating a whole new role. If a user has no row here for a module,
-- they simply fall back to their role's permission for that module —
-- so this is additive and safe to run on an existing workspace.
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (same as the other add_*.sql files).

create table if not exists user_permissions (
  user_id uuid references profiles(id) on delete cascade,
  module_key text references modules(key) on delete cascade,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  primary key (user_id, module_key)
);

alter table user_permissions enable row level security;

drop policy if exists "user perms read" on user_permissions;
create policy "user perms read" on user_permissions for select using (auth.role() = 'authenticated');
drop policy if exists "user perms write" on user_permissions;
create policy "user perms write" on user_permissions for all using (auth.role() = 'authenticated');
