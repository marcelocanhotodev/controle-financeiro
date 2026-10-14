# Design: Estrutura base do Caixa Comum

## Context
Ver `proposal.md` e `openspec/project.md`. O projeto começa do zero e segue por inteiro a stack e a organização do matilha-app (`C:\Projeto\matilha-app`), que já está em produção. Cada decisão abaixo aponta o arquivo do matilha-app que serve de modelo. A interface segue o protótipo `openspec/prototype/Caixa Comum.html`.

Esta é a primeira de quatro changes:

```
 estrutura-base --> usuarios-e-grupos --> lancamentos --> resumo-mensal
```

## Goals / Non-Goals
Goals:
- Projeto que compila, testa, roda no Docker e publica na Vercel antes de existir qualquer regra de negócio
- Casca da interface pronta para as próximas changes só preencherem as abas

Non-Goals:
- Tabelas no banco. Cada change seguinte traz a própria migração Prisma
- Login. Nesta parte, as abas são públicas e vazias. A proteção chega em `usuarios-e-grupos`

## Decisions

### Decision: Stack do matilha-app por inteiro
Escolhido: Next.js 14 (App Router), TypeScript estrito, Prisma 5, Zod, Tailwind e Vitest, com as mesmas versões do `package.json` do matilha-app, sem as dependências de Mercado Pago, WhatsApp e Storage. Auth.js, bcrypt, nodemailer e Recharts entram nas changes que os usam.
Por quê: o ganho está em copiar código já testado em produção, não só a estrutura de pastas.
Alternativa descartada: Supabase Auth + `supabase-js` + RLS. Daria uma segunda camada de proteção, mas criaria um segundo padrão de projeto para manter e não aproveitaria nada do matilha-app.

### Decision: Prisma configurado, sem models
Escolhido: `prisma/schema.prisma` com `generator` (incluindo os `binaryTargets` do matilha-app) e `datasource` usando `DATABASE_URL` e `DIRECT_URL`, mais `src/lib/prisma.ts` (cliente único). Nenhuma tabela nesta parte.
Por quê: cada change seguinte cria a própria migração, como no histórico `prisma/migrations` do matilha-app.
Consequência: o Prisma 5 recusa `prisma generate` com zero models ("You don't have any models defined"). Por isso, nesta parte o `package.json` não tem o `postinstall: prisma generate` do matilha-app, e o schema é verificado com `prisma validate`. O `postinstall` volta em `usuarios-e-grupos`, junto com os primeiros models. Até lá, `src/lib/prisma.ts` existe, mas nada o importa.

### Decision: Variáveis de ambiente validadas no boot
Escolhido: copiar `src/lib/env.ts` e `src/instrumentation.ts` do matilha-app (com `instrumentationHook: true` em `next.config.mjs`), validando nesta parte só `DATABASE_URL` e `DIRECT_URL`. Cada change seguinte acrescenta as suas variáveis ao mesmo arquivo e ao `.env.example`.

### Decision: Desenvolvimento com Docker Compose
Escolhido: `docker-compose.yml` e `Dockerfile.dev` no modelo do matilha-app, com Postgres e o app em `next dev` com o código montado por volume. Sem o compose de produção e o `Dockerfile` multi-stage, porque o deploy é só na Vercel.

### Decision: Testes com Vitest e Playwright
Escolhido:
- Vitest como no `vitest.config.ts` do matilha-app: ambiente `node`, contra o Postgres do Docker Compose, `fileParallelism: false`, arquivos `*.test.ts` ao lado do código.
- Playwright em `e2e/` (acréscimo ao matilha-app), contra `next start`, com dois projetos: celular (390 px) e desktop.
- CI em `.github/workflows/ci.yml`, copiado do matilha-app: Postgres efêmero, lint, type-check, `prisma migrate deploy`, Vitest, build e Playwright.

### Decision: Publicação
Escolhido, como no matilha-app: Vercel para o app, Supabase de produção só como Postgres (pooler na porta 6543 em `DATABASE_URL`, conexão direta na 5432 em `DIRECT_URL`), `.github/workflows/deploy-migrations.yml` aplicando `prisma migrate deploy` a cada push na main, e `docs/deploy-producao.md` adaptado.

### Decision: Casca da interface
Escolhido:
- `src/app/(dashboard)/layout.tsx` com a barra superior e as abas Resumo, Lançamentos e Grupo, como `(dashboard)/layout.tsx` e `navegacao-mobile.tsx` do matilha-app. `/` redireciona para `/resumo`. Cada aba mostra um estado vazio até a change que a preenche.
- Cores do protótipo como variáveis CSS em `globals.css`, com valores para claro e escuro (`prefers-color-scheme`), ligadas ao `tailwind.config.ts`.
- Componente de aviso em `src/components/aviso.tsx`, com provedor de contexto, região `aria-live`, 6 segundos e ação opcional ("Desfazer"). A regra de tempo fica numa função pura testável.
- PWA: `src/app/manifest.ts`, ícones em `public/icons/` e um service worker mínimo em `public/sw.js` que só serve a página de "sem conexão".

## Risks / Trade-offs
- [Casca publicada sem login] → as abas não mostram dado nenhum até `usuarios-e-grupos`. A URL de produção pode ficar sem divulgação até lá.
- [Playwright deixa o CI mais lento] → navegadores em cache no GitHub Actions e só Chromium no CI.
- [O plano gratuito do Supabase pode pausar o projeto por inatividade] → para uso real, escolher um plano com backup automático.
- [O PWA no iPhone tem limites] → não afeta o MVP, que não usa notificações.

## Migration Plan
Projeto novo, sem dados. O primeiro push na main publica a casca na Vercel e roda o workflow de migrações (sem migrações ainda). Rollback: reverter o deploy pela Vercel.

## Open Questions
- Deploys de preview da Vercel: apontar para um segundo projeto Supabase ou desligar o acesso ao banco nos previews. Só muda a configuração do deploy.
