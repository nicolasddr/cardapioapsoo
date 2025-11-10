-- Corrigir política RLS da tabela orders para permitir UPDATE corretamente
-- A política atual usa apenas USING, mas UPDATE precisa de WITH CHECK também

DROP POLICY IF EXISTS orders_admin_all ON public.orders;

-- Recriar política com USING e WITH CHECK para UPDATE funcionar corretamente
CREATE POLICY orders_admin_all ON public.orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

