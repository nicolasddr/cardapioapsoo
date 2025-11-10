# POO Cardápio

Sistema de cardápio digital desenvolvido com Next.js, TypeScript e Supabase seguindo princípios de Programação Orientada a Objetos.

## Requisitos

- Node.js 18+ 
- npm ou yarn

## Instalação

1. Instale as dependências:

```bash
npm install
```

2. Configure as variáveis de ambiente:

Copie `.env.local.example` para `.env.local` e configure as variáveis do Supabase:

```bash
cp .env.local.example .env.local
```

3. Execute o servidor de desenvolvimento:

```bash
npm run dev
```

4. Acesse a aplicação:

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Banco de Dados

### Seed de Dados de Opcionais

Para testar a funcionalidade de opcionais (Story 1.2), execute o script de seed:

```bash
# Via Supabase Dashboard ou SQL Editor
# Execute o arquivo: supabase/seed-options.sql
```

O script cria:
- 3 grupos de opcionais (Tamanho, Adicionais, Tempero)
- 10 opcionais distribuídos entre os grupos
- Associações entre produtos existentes e grupos de opcionais
- Atualiza produtos com `description` e `photo_url` quando ausentes

**Nota:** O seed já foi aplicado via migration `seed_option_groups_and_options` no projeto Supabase.

## Testes

Execute os testes unitários:

```bash
npm test
```

Execute testes com cobertura:

```bash
npm run test:coverage
```

Execute testes em modo watch:

```bash
npm run test:watch
```

## Estrutura do Projeto

```
├── app/                    # Next.js App Router
│   ├── menu/              # Página do cardápio
│   └── layout.tsx         # Layout raiz
├── src/
│   ├── domain/
│   │   └── entities/      # Classes POO (Category, Product, StoreConfig, OptionGroup, Option)
│   ├── components/
│   │   └── menu/          # Componentes do cardápio
│   ├── contexts/          # Context providers (CartContext)
│   ├── types/             # Tipos TypeScript
│   └── utils/             # Utilitários
├── lib/
│   └── supabase/          # Clientes Supabase (client/server)
├── supabase/
│   └── seed-options.sql   # Script de seed para opcionais
└── docs/                   # Documentação do projeto
```

## Funcionalidades Implementadas

### Story 1.1: Visualizar Cardápio por Categoria
- ✅ Visualização de cardápio por categorias
- ✅ Navegação por âncora com scroll suave
- ✅ Filtro de produtos e categorias ativas
- ✅ Responsividade mobile-first
- ✅ Integração com Supabase

### Story 1.2: Adicionar Produto ao Carrinho
- ✅ Modal de detalhes do produto
- ✅ Seleção de opcionais (única e múltipla)
- ✅ Cálculo dinâmico de preço total
- ✅ Seletor de quantidade com validações
- ✅ Campo de observações
- ✅ Integração com carrinho (localStorage)
- ✅ Confirmação visual (toast)

## Próximos Passos

- Implementar Story 1.3: Revisar Carrinho
- Implementar Story 1.4: Finalizar Pedido
- Adicionar testes E2E com Playwright
