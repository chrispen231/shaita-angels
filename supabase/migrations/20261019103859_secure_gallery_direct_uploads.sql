-- Direct browser uploads bypass the Next.js Server Action body-size limit.
-- Preserve the same content/super-admin restriction enforced by uploadImage().
drop policy if exists "Admins can upload gallery photos" on storage.objects;

create policy "Content editors can upload gallery photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'gallery'
    and public.has_any_role(array['content', 'super_admin'])
  );
