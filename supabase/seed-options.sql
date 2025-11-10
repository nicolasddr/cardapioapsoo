-- Seed Script para Opcionais (Story 1.2)
-- Este script popula o banco com dados de exemplo para testar funcionalidade de opcionais

-- 1. Criar grupos de opcionais
INSERT INTO option_groups (id, name, selection_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Tamanho', 'single'),
  ('00000000-0000-0000-0000-000000000002', 'Adicionais', 'multiple'),
  ('00000000-0000-0000-0000-000000000003', 'Tempero', 'single')
ON CONFLICT (id) DO NOTHING;

-- 2. Criar opcionais para cada grupo
INSERT INTO options (id, name, additional_price, option_group_id) VALUES
  -- Opcionais de Tamanho (seleção única)
  ('00000000-0000-0000-0000-000000000010', 'Pequeno', 0.00, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000011', 'Médio', 3.00, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000012', 'Grande', 6.00, '00000000-0000-0000-0000-000000000001'),
  
  -- Opcionais de Adicionais (seleção múltipla)
  ('00000000-0000-0000-0000-000000000020', 'Bacon', 2.50, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000021', 'Queijo Extra', 2.00, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000022', 'Ovo', 1.50, '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000023', 'Cebola Caramelizada', 1.00, '00000000-0000-0000-0000-000000000002'),
  
  -- Opcionais de Tempero (seleção única)
  ('00000000-0000-0000-0000-000000000030', 'Sem tempero extra', 0.00, '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000031', 'Picante', 0.00, '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000032', 'Tempero especial', 1.00, '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- 3. Associar grupos de opcionais a produtos existentes
-- Primeiro, vamos buscar alguns produtos para associar
DO $$
DECLARE
  product_id_1 UUID;
  product_id_2 UUID;
  product_id_3 UUID;
BEGIN
  -- Buscar primeiros 3 produtos disponíveis
  SELECT id INTO product_id_1 FROM products WHERE status = 'Ativo' LIMIT 1 OFFSET 0;
  SELECT id INTO product_id_2 FROM products WHERE status = 'Ativo' LIMIT 1 OFFSET 1;
  SELECT id INTO product_id_3 FROM products WHERE status = 'Ativo' LIMIT 1 OFFSET 2;
  
  -- Associar grupos de opcionais aos produtos
  -- Produto 1: Tamanho + Adicionais
  IF product_id_1 IS NOT NULL THEN
    INSERT INTO product_option_links (product_id, option_group_id) VALUES
      (product_id_1, '00000000-0000-0000-0000-000000000001'::uuid),
      (product_id_1, '00000000-0000-0000-0000-000000000002'::uuid)
    ON CONFLICT (product_id, option_group_id) DO NOTHING;
  END IF;
  
  -- Produto 2: Tamanho + Tempero
  IF product_id_2 IS NOT NULL THEN
    INSERT INTO product_option_links (product_id, option_group_id) VALUES
      (product_id_2, '00000000-0000-0000-0000-000000000001'::uuid),
      (product_id_2, '00000000-0000-0000-0000-000000000003'::uuid)
    ON CONFLICT (product_id, option_group_id) DO NOTHING;
  END IF;
  
  -- Produto 3: Todos os grupos
  IF product_id_3 IS NOT NULL THEN
    INSERT INTO product_option_links (product_id, option_group_id) VALUES
      (product_id_3, '00000000-0000-0000-0000-000000000001'::uuid),
      (product_id_3, '00000000-0000-0000-0000-000000000002'::uuid),
      (product_id_3, '00000000-0000-0000-0000-000000000003'::uuid)
    ON CONFLICT (product_id, option_group_id) DO NOTHING;
  END IF;
END $$;

-- 4. Atualizar produtos existentes com description e photo_url (se não tiverem)
UPDATE products 
SET 
  description = COALESCE(description, 'Delicioso prato preparado com ingredientes frescos e selecionados.'),
  photo_url = COALESCE(photo_url, 'https://via.placeholder.com/400x300?text=Produto')
WHERE description IS NULL OR photo_url IS NULL
LIMIT 5;

