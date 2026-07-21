-- Run this once in the Supabase SQL Editor after deploying the updated
-- code. `invoices` and `payments` were missing from the app's module
-- registry, so no role ever had a role_permissions row for them —
-- non-Admins couldn't see or be granted either page. This adds a
-- sensible default grant to every existing non-Admin role (matching
-- their access to Orders/Quotations); Admin already gets full access
-- automatically regardless of these rows.
--
-- Adjust the can_view/can_edit values below if you'd rather these
-- default to view-only for your team.

insert into role_permissions (role_id, module_key, can_view, can_edit, can_delete)
select id, 'invoices', true, true, false
from roles
where name <> 'Admin'
on conflict (role_id, module_key) do nothing;

insert into role_permissions (role_id, module_key, can_view, can_edit, can_delete)
select id, 'payments', true, true, false
from roles
where name <> 'Admin'
on conflict (role_id, module_key) do nothing;
