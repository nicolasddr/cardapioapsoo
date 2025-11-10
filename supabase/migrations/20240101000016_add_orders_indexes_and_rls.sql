-- Add indexes for performance on orders table
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);

-- Enable RLS on orders, order_items, and order_item_options
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;

-- Policy for orders: admins can do everything
CREATE POLICY orders_admin_all ON public.orders
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Policy for order_items: admins can do everything
CREATE POLICY order_items_admin_all ON public.order_items
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Policy for order_item_options: admins can do everything
CREATE POLICY order_item_options_admin_all ON public.order_item_options
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

