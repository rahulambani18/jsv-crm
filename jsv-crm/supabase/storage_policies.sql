-- Run this in Supabase SQL Editor AFTER creating the "attachments" bucket
-- (Supabase Dashboard → Storage → New bucket → name it exactly "attachments",
-- toggle "Public bucket" ON, then run this SQL).
--
-- This lets any logged-in user of your CRM upload and read files in that
-- bucket, matching how the rest of the app's permissions work.

create policy "Authenticated users can upload attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'attachments');

create policy "Authenticated users can read attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'attachments');

create policy "Authenticated users can delete their attachments"
on storage.objects for delete
to authenticated
using (bucket_id = 'attachments');
