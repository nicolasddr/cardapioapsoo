-- Adicionar índices para otimizar buscas de clientes na tabela orders
-- Estes índices melhoram a performance das queries de busca por nome e telefone

-- Índice para customer_phone (apenas para valores não-nulos, pois apenas pedidos de Retirada têm telefone)
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone 
ON public.orders(customer_phone) 
WHERE customer_phone IS NOT NULL;

-- Índice para customer_name (apenas para valores não-nulos)
CREATE INDEX IF NOT EXISTS idx_orders_customer_name 
ON public.orders(customer_name) 
WHERE customer_name IS NOT NULL;

