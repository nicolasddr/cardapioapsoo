# Sistema de Cardápio

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

Abra [http://localhost:3000](http://localhost:3000/menu) no seu navegador.

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

