# Proposal: Estrutura base do Caixa Comum

## Why
O Caixa Comum (ver `openspec/project.md`) será construído em quatro partes pequenas: estrutura, usuários e grupos, lançamentos e resumo. Esta é a primeira. Ela monta o projeto no padrão do matilha-app e a casca da interface, para que as próximas partes só acrescentem funcionalidades, sem retrabalho de configuração.

## What Changes
- Projeto Next.js 14 com TypeScript, Tailwind, Prisma (ainda sem tabelas), validação de variáveis de ambiente e Docker Compose para desenvolvimento, copiando a organização do matilha-app
- Testes com Vitest e Playwright desde o início, mais CI no GitHub Actions
- Pipeline de publicação: Vercel, Supabase como Postgres e workflow de migrações em produção
- Casca da interface seguindo o protótipo (`openspec/prototype/Caixa Comum.html`): barra superior com o nome do app, abas Resumo, Lançamentos e Grupo (ainda sem conteúdo), layout responsivo, tema claro e escuro, componente de aviso, acessibilidade e instalação como PWA

Fora do escopo desta parte: login, grupos, lançamentos e resumo, que chegam nas changes `usuarios-e-grupos`, `lancamentos` e `resumo-mensal`.

## Capabilities

### New Capabilities
- `estrutura-app`: navegação por abas, barra superior, layout responsivo, tema, avisos, acessibilidade e instalação como app

### Modified Capabilities
Nenhuma.

## Impact
- Cria o projeto em `C:\Projeto\controle-financeiro` com as dependências do matilha-app: `next@14`, `react@18`, `typescript`, `tailwindcss`, `prisma`, `@prisma/client`, `zod`, `vitest`, mais `@playwright/test`
- Serviços: GitHub Actions, Vercel e um projeto Supabase de produção
- Todas as changes seguintes dependem desta
