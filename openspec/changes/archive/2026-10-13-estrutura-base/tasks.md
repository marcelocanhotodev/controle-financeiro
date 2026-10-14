# Tasks

Referência de código: `C:\Projeto\matilha-app`. Referência de interface: `openspec/prototype/Caixa Comum.html`.

## 1. Projeto
- [x] 1.1 Criar o projeto Next.js 14 copiando do matilha-app `package.json` (mesmas versões, só as dependências desta parte), `tsconfig.json`, `.eslintrc.json`, `next.config.mjs`, `postcss.config.js`, `tailwind.config.ts` e `.gitignore`. Verificação: `npm run lint`, `npm run type-check` e `npm run build` passam
- [x] 1.2 Criar `docker-compose.yml` e `Dockerfile.dev` no modelo do matilha-app, com Postgres e o app em modo dev. Verificação: `docker compose up` sobe o banco e a página inicial responde em `http://localhost:3000`
- [x] 1.3 Criar `src/lib/env.ts`, `src/instrumentation.ts` e `.env.example` validando `DATABASE_URL` e `DIRECT_URL`. Verificação: `env.test.ts` cobre variável ausente e URL inválida
- [x] 1.4 Criar `prisma/schema.prisma` com `generator` e `datasource` (sem models) e `src/lib/prisma.ts`, sem o `postinstall: prisma generate` (o Prisma 5 recusa gerar com zero models; ele volta em `usuarios-e-grupos`). Verificação: `npx prisma validate` passa e `npm ci` termina sem erro
- [x] 1.5 Copiar `vitest.config.ts` do matilha-app e criar `playwright.config.ts` com projetos de celular (390 px) e desktop e `webServer` em `next start`. Verificação: `npm test` roda `env.test.ts` e `npx playwright test` roda um teste de fumaça que abre `/`
- [ ] 1.6 Criar `.github/workflows/ci.yml` no modelo do matilha-app: Postgres efêmero, lint, type-check, `prisma migrate deploy`, Vitest, build e Playwright com a instalação do Chromium. Verificação: o workflow passa num pull request

## 2. Casca da interface (`estrutura-app`)
- [x] 2.1 Criar `(dashboard)/layout.tsx` com a barra superior ("Caixa Comum") e as abas Resumo, Lançamentos e Grupo com `aria-current`, cada uma com estado vazio, e `/` redirecionando para `/resumo`. Verificação: teste Playwright de troca de abas e da aba inicial
- [x] 2.2 Cores do protótipo como variáveis CSS para claro e escuro, ligadas ao Tailwind. Verificação: teste Playwright com `colorScheme: "dark"` confere a cor de fundo do `body`
- [x] 2.3 Layout responsivo com margem lateral de 16 px e quadros com rolagem própria. Verificação: teste Playwright a 360 px e 400 px confere que `scrollWidth` não passa da largura da tela
- [x] 2.4 Componente de aviso com provedor, região `aria-live`, 6 segundos e ação opcional. Verificação: teste unitário da regra de tempo e teste Playwright numa página de exemplo só de desenvolvimento
- [x] 2.5 Foco visível em todos os elementos interativos e padrão de rótulo para campos e botões de ícone. Verificação: checagem de acessibilidade do Playwright nas três abas sem violações
- [x] 2.6 `src/app/manifest.ts`, ícones e `public/sw.js` com a página de "sem conexão". Verificação: o Chrome não aponta nenhum erro de instalabilidade (`Page.getInstallabilityErrors` pelo DevTools Protocol, que substitui a auditoria de PWA removida do Lighthouse 12) e o teste Playwright em modo offline mostra a mensagem de conexão

## 3. Publicação
- [ ] 3.1 Criar `.github/workflows/deploy-migrations.yml` e `docs/deploy-producao.md` adaptados do matilha-app (Supabase pooler e conexão direta, variáveis da Vercel). Verificação: o passo a passo do documento funciona num projeto Supabase novo
- [ ] 3.2 Conectar o repositório à Vercel com as variáveis de produção. Verificação: a casca abre em HTTPS na URL de produção
- [ ] 3.3 Instalar o PWA num celular Android e num iPhone. Verificação: abre em tela cheia com o nome e o ícone do Caixa Comum

## Workflow follow-up
- Rodar `openspec validate estrutura-base --strict` e arquivar a change antes de começar `usuarios-e-grupos`.
