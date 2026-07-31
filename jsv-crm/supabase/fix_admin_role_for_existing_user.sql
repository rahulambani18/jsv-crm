-- Run this once in the Supabase SQL Editor to fix an account that is
-- showing "Sales Executive" instead of "Admin" in the sidebar, and/or
-- getting "You do not have permission to create users" when it
-- shouldn't.
--
-- Root cause: if a person's profiles row was created before schema.sql
-- ran (e.g. the very first login, before any roles existed yet), the
-- app used to fall back to the Sales Executive role for everyone,
-- including whoever should have been the workspace's Admin. That
-- fallback has been fixed in the app for *new* accounts going forward
-- (see src/lib/api.js), but it doesn't retroactively fix a profile
-- that was already created with the wrong role. Run the SELECT first
-- to confirm you're updating the right person, then the UPDATE.

-- 1. Check current role assignment (replace the email below):
select p.id, p.full_name, u.email, r.name as current_role
from profiles p
join auth.users u on u.id = p.id
left join roles r on r.id = p.role_id
where u.email = 'rahul@jsvchem.com';

-- 2. If current_role shows "Sales Executive" (or is blank) and this
--    should be an Admin account, fix it:
update profiles
set role_id = '00000000-0000-0000-0000-000000000002'  -- Admin role, seeded by schema.sql
where id = (select id from auth.users where email = 'rahul@jsvchem.com');

-- 3. Confirm the fix:
select p.id, p.full_name, u.email, r.name as current_role
from profiles p
join auth.users u on u.id = p.id
left join roles r on r.id = p.role_id
where u.email = 'rahul@jsvchem.com';
