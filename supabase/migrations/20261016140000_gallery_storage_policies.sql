-- Add storage policies for the gallery bucket.
--
-- The gallery bucket was created in 20261016130000_gallery.sql without
-- the storage.objects policies that the original four buckets have.
-- Without these, uploads fail with a generic error.

-- 1. Anyone can read published gallery photos (public bucket).
create policy "Gallery photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'gallery');

-- 2. Authenticated admins can upload to the gallery bucket.
create policy "Admins can upload gallery photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery');

-- 3. Super admins can delete gallery photos.
create policy "Super admins can delete gallery photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery');
