-- Create product-media bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'product-media', 'product-media', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'product-media'
);

-- Remove existing policies to avoid duplicates
DROP POLICY IF EXISTS "Public read access to product-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to product-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product-media" ON storage.objects;

-- Allow anonymous/public read access
CREATE POLICY "Public read access to product-media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-media');

-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload to product-media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to update objects
CREATE POLICY "Admins can update product-media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'product-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to delete objects
CREATE POLICY "Admins can delete product-media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Checklist reminder for multi-region environments (staging/production)
-- 1. Confirmar bucket existe em todos os ambientes após deploy
-- 2. Verificar políticas de acesso executando SELECT nas tabelas storage.objects
-- 3. Testar upload/remoção de imagens de produtos via interface admin

