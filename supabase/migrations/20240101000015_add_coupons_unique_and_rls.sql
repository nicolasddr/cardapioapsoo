-- Add UNIQUE constraint to code column
ALTER TABLE public.coupons
ADD CONSTRAINT coupons_code_unique UNIQUE (code);

-- Create index for performance
CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (code);
CREATE INDEX IF NOT EXISTS coupons_status_idx ON public.coupons (status);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anonymous users to SELECT only active coupons
CREATE POLICY coupons_select_active ON public.coupons
FOR SELECT
USING (status = 'Ativo');

-- Policy 2: Allow admins to do everything
CREATE POLICY coupons_admin_all ON public.coupons
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

