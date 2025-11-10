-- Create store-media bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'store-media', 'store-media', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'store-media'
);

-- Remove existing policies to avoid duplicates
DROP POLICY IF EXISTS "Public read access to store-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to store-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update store-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete store-media" ON storage.objects;

-- Allow anonymous/public read access
CREATE POLICY "Public read access to store-media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'store-media');

-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload to store-media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'store-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to update objects
CREATE POLICY "Admins can update store-media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'store-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'store-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to delete objects
CREATE POLICY "Admins can delete store-media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'store-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Checklist reminder for multi-region environments (staging/production)
-- 1. Confirm bucket exists em todos os ambientes após deploy
-- 2. Verificar políticas de acesso executando SELECT nas tabelas storage.objects
