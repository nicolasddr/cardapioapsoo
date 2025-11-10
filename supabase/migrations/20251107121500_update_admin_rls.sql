-- Atualiza políticas de RLS para evitar recursão e permitir leitura pública

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can manage store_settings" ON store_settings;
DROP POLICY IF EXISTS "Only admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Only admins can manage products" ON products;
DROP POLICY IF EXISTS "Only admins can manage option_groups" ON option_groups;
DROP POLICY IF EXISTS "Only admins can manage options" ON options;
DROP POLICY IF EXISTS "Only admins can manage product_option_links" ON product_option_links;
DROP POLICY IF EXISTS "Only admins can manage coupons" ON coupons;

DROP POLICY IF EXISTS "store_settings_select_public" ON store_settings;
DROP POLICY IF EXISTS "categories_select_public" ON categories;
DROP POLICY IF EXISTS "products_select_public" ON products;
DROP POLICY IF EXISTS "option_groups_select_public" ON option_groups;
DROP POLICY IF EXISTS "options_select_public" ON options;
DROP POLICY IF EXISTS "product_option_links_select_public" ON product_option_links;
DROP POLICY IF EXISTS "coupons_select_public" ON coupons;
DROP POLICY IF EXISTS "store_settings_insert_admin" ON store_settings;
DROP POLICY IF EXISTS "store_settings_update_admin" ON store_settings;
DROP POLICY IF EXISTS "store_settings_delete_admin" ON store_settings;
DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
DROP POLICY IF EXISTS "categories_update_admin" ON categories;
DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
DROP POLICY IF EXISTS "products_insert_admin" ON products;
DROP POLICY IF EXISTS "products_update_admin" ON products;
DROP POLICY IF EXISTS "products_delete_admin" ON products;
DROP POLICY IF EXISTS "option_groups_insert_admin" ON option_groups;
DROP POLICY IF EXISTS "option_groups_update_admin" ON option_groups;
DROP POLICY IF EXISTS "option_groups_delete_admin" ON option_groups;
DROP POLICY IF EXISTS "options_insert_admin" ON options;
DROP POLICY IF EXISTS "options_update_admin" ON options;
DROP POLICY IF EXISTS "options_delete_admin" ON options;
DROP POLICY IF EXISTS "product_option_links_insert_admin" ON product_option_links;
DROP POLICY IF EXISTS "product_option_links_update_admin" ON product_option_links;
DROP POLICY IF EXISTS "product_option_links_delete_admin" ON product_option_links;
DROP POLICY IF EXISTS "coupons_insert_admin" ON coupons;
DROP POLICY IF EXISTS "coupons_update_admin" ON coupons;
DROP POLICY IF EXISTS "coupons_delete_admin" ON coupons;

-- store_settings
CREATE POLICY "store_settings_select_public"
ON store_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "store_settings_write_admin"
ON store_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- categories
CREATE POLICY "categories_select_public"
ON categories
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "categories_write_admin"
ON categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- products
CREATE POLICY "products_select_public"
ON products
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "products_write_admin"
ON products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- option_groups
CREATE POLICY "option_groups_select_public"
ON option_groups
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "option_groups_write_admin"
ON option_groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- options
CREATE POLICY "options_select_public"
ON options
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "options_write_admin"
ON options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- product_option_links
CREATE POLICY "product_option_links_select_public"
ON product_option_links
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "product_option_links_write_admin"
ON product_option_links
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- coupons
CREATE POLICY "coupons_select_public"
ON coupons
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "coupons_write_admin"
ON coupons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);
