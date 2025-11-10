-- Seed Data para Story 1.1: Visualizar Cardápio por Categoria
-- Este script insere dados básicos para permitir testar a funcionalidade da página de cardápio
-- Execute este script no Supabase SQL Editor ou via migration

-- Limpar dados existentes (opcional - descomente se necessário)
-- TRUNCATE TABLE products CASCADE;
-- TRUNCATE TABLE categories CASCADE;
-- TRUNCATE TABLE store_settings CASCADE;

-- Inserir configurações da loja
INSERT INTO store_settings (id, name, logo_url, cover_url, description, opening_hours)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Restaurante Bom Sabor',
  NULL, -- Logo pode ser adicionado depois
  NULL, -- Imagem de capa pode ser adicionada depois
  'Bem-vindo ao Restaurante Bom Sabor! Oferecemos pratos deliciosos preparados com ingredientes frescos e de qualidade.',
  'Segunda a Sexta: 11h às 22h | Sábado e Domingo: 12h às 23h'
)
ON CONFLICT (id) DO NOTHING;

-- Inserir categorias
INSERT INTO categories (id, name, "order", active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Entradas', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Pratos Principais', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'Bebidas', 3, true),
  ('44444444-4444-4444-4444-444444444444', 'Sobremesas', 4, true)
ON CONFLICT (id) DO NOTHING;

-- Inserir produtos - Entradas
INSERT INTO products (id, name, price, category_id, status, "order") VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bruschetta', 18.90, '11111111-1111-1111-1111-111111111111', 'Ativo', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Carpaccio', 32.50, '11111111-1111-1111-1111-111111111111', 'Ativo', 2),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Salada Caesar', 24.90, '11111111-1111-1111-1111-111111111111', 'Ativo', 3)
ON CONFLICT (id) DO NOTHING;

-- Inserir produtos - Pratos Principais
INSERT INTO products (id, name, price, category_id, status, "order") VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Penne ao Molho Branco', 42.90, '22222222-2222-2222-2222-222222222222', 'Ativo', 1),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Risotto de Camarão', 58.90, '22222222-2222-2222-2222-222222222222', 'Ativo', 2),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Salada de Salmão Grelhado', 52.50, '22222222-2222-2222-2222-222222222222', 'Ativo', 3),
  ('11111111-1111-1111-1111-111111111112', 'Hambúrguer Artesanal', 38.90, '22222222-2222-2222-2222-222222222222', 'Ativo', 4)
ON CONFLICT (id) DO NOTHING;

-- Inserir produtos - Bebidas
INSERT INTO products (id, name, price, category_id, status, "order") VALUES
  ('22222222-2222-2222-2222-222222222221', 'Água Mineral', 5.90, '33333333-3333-3333-3333-333333333333', 'Ativo', 1),
  ('33333333-3333-3333-3333-333333333331', 'Refrigerante Lata', 7.90, '33333333-3333-3333-3333-333333333333', 'Ativo', 2),
  ('44444444-4444-4444-4444-444444444441', 'Suco Natural', 12.90, '33333333-3333-3333-3333-333333333333', 'Ativo', 3),
  ('55555555-5555-5555-5555-555555555551', 'Cerveja Artesanal', 18.90, '33333333-3333-3333-3333-333333333333', 'Ativo', 4)
ON CONFLICT (id) DO NOTHING;

-- Inserir produtos - Sobremesas
INSERT INTO products (id, name, price, category_id, status, "order") VALUES
  ('66666666-6666-6666-6666-666666666661', 'Tiramisu', 22.90, '44444444-4444-4444-4444-444444444444', 'Ativo', 1),
  ('77777777-7777-7777-7777-777777777771', 'Brownie com Sorvete', 19.90, '44444444-4444-4444-4444-444444444444', 'Ativo', 2),
  ('88888888-8888-8888-8888-888888888881', 'Pudim de Leite', 15.90, '44444444-4444-4444-4444-444444444444', 'Ativo', 3)
ON CONFLICT (id) DO NOTHING;

-- Verificar dados inseridos
SELECT 'store_settings' as tabela, COUNT(*) as total FROM store_settings
UNION ALL
SELECT 'categories' as tabela, COUNT(*) as total FROM categories
UNION ALL
SELECT 'products' as tabela, COUNT(*) as total FROM products;

