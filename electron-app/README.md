# Aplicativo Electron - POO Cardápio Pedidos

Aplicativo desktop para receber notificações de novos pedidos em tempo real.

## Instalação

1. Instale as dependências:
```bash
cd electron-app
npm install
```

2. Configure as credenciais do Supabase:
   - **IMPORTANTE:** Edite `src/config/config.json` e preencha a `serviceRoleKey`
   - A Service Role Key pode ser obtida no Dashboard do Supabase: **Settings** → **API** → **service_role key**
   - Veja `CONFIGURACAO.md` para instruções detalhadas

3. Execute o aplicativo:
```bash
npm run dev
```

O script compila o TypeScript e copia os arquivos necessários automaticamente.

## Desenvolvimento

Para executar em modo desenvolvimento:
```bash
npm run dev
```

O script compila o TypeScript e copia os arquivos necessários automaticamente.

## Build

Para criar um executável para macOS:
```bash
npm run build:mac
```

O executável será gerado em `release/`.

## Configuração

O arquivo `src/config/config.json` contém:
- Credenciais do Supabase (URL e Service Role Key)
- Configurações de notificações (som habilitado, volume, delay de auto-fechamento)

**Importante:** A Service Role Key deve ser mantida em segredo. Não compartilhe este arquivo.

## Funcionalidades

- ✅ Notificações visuais de novos pedidos
- ✅ Notificações sonoras configuráveis
- ✅ Fila de pedidos em tempo real
- ✅ Reconexão automática com exponential backoff
- ✅ Cache de pedidos notificados para evitar duplicatas
- ✅ Indicador de status da conexão

## Estrutura do Projeto

```
electron-app/
├── src/
│   ├── main.ts              # Processo principal Electron
│   ├── preload.ts           # Preload script (IPC)
│   ├── renderer/
│   │   ├── index.html       # HTML principal
│   │   ├── renderer.ts      # Código principal (TypeScript)
│   │   └── styles.css       # Estilos
│   └── config/
│       ├── config.example.json
│       └── config.json      # Configuração (criar manualmente)
├── dist/                    # Build output
└── package.json
```

