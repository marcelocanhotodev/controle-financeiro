# Deploy em produção (Vercel + Supabase)

Checklist reprodutível para configurar o ambiente de produção do Caixa Comum
do zero, adaptado de `docs/deploy-producao.md` do matilha-app.

> Contexto: o Supabase entra aqui **só como Postgres gerenciado**. O app não
> usa Supabase Auth, `supabase-js` nem RLS — a autenticação é do Auth.js
> (chega na change `usuarios-e-grupos`) e todo acesso ao banco passa pelo
> Prisma. As variáveis de produção ficam nas env vars nativas da Vercel
> (Project Settings → Environment Variables), sem secret manager externo.
>
> Este guia cresce junto com o projeto: cada change que cria uma variável de
> ambiente acrescenta a seção dela aqui e no checklist do fim (ver "Quando uma
> nova variável de ambiente obrigatória for adicionada").

## 1. Banco de dados (Supabase)

O Supabase expõe duas connection strings diferentes — o projeto precisa das
**duas**, em variáveis separadas:

1. Crie o projeto no [Supabase](https://supabase.com). Escolha a região
   **South America (São Paulo)**, a mais próxima de quem usa o app, e guarde
   a senha do banco num cofre de senhas.
2. No painel do projeto, vá em **Project Settings → Database → Connection
   string** (ou no botão **Connect** do topo).
3. **`DATABASE_URL`** — usada pelo app em runtime: a connection string do
   **connection pooler** (modo *transaction*, porta **6543**), **não** a
   conexão direta.
   - Motivo: a Vercel roda o app como funções serverless; a conexão direta
     tem um limite baixo de conexões simultâneas e costuma ser IPv6-only,
     inalcançável a partir da rede da Vercel.
   - **Usuário qualificado com a referência do projeto**
     (`postgres.<referencia>`, nunca só `postgres`) — sem isso o pooler
     recusa a conexão com `FATAL: no tenant identifier provided`.
   - **`?pgbouncer=true` obrigatório no final da URL** — sem ele, o Prisma
     tenta reaproveitar *prepared statements* numa conexão que o pooler
     recicla, e o app falha de forma **intermitente** com
     `prepared statement "sN" already exists`.
   - Formato esperado:
     ```
     postgresql://postgres.<referencia-do-projeto>:<senha>@aws-0-<regiao>.pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
4. **`DIRECT_URL`** — usada **só** por `prisma migrate deploy`: a conexão
   **direta** (porta **5432**), não o pooler. O pooler em modo *transaction*
   não suporta os prepared statements do Prisma Migrate.
   - Formato esperado:
     ```
     postgresql://postgres.<referencia-do-projeto>:<senha>@aws-0-<regiao>.pooler.supabase.com:5432/postgres
     ```
5. **Senha com caracteres especiais** precisa estar **URL-encoded** dentro das
   duas strings (`@` vira `%40`, `#` vira `%23`), senão o parser tenta ler
   parte da senha como host ou porta.

**Se a senha do banco for trocada no Supabase depois do setup**: as duas
variáveis ficam inválidas na hora — atualize `DATABASE_URL` e `DIRECT_URL` na
Vercel **e** os Secrets do GitHub (seção 3), e faça um novo deploy.

## 2. Cadastrar as variáveis na Vercel

1. Importe o repositório como projeto novo na [Vercel](https://vercel.com/new).
   O framework (Next.js) é detectado sozinho; não mude os comandos de build.
2. Em **Project Settings → Environment Variables**, adicione, com o escopo
   **Production** marcado:
   - `DATABASE_URL` → connection string do **pooler**, porta 6543 (seção 1.3)
   - `DIRECT_URL` → connection string **direta**, porta 5432 (seção 1.4) —
     diferente de `DATABASE_URL`
3. Não marque **Preview** apontando para o banco de produção. Se quiser
   previews com banco, crie um segundo projeto Supabase só para isso.
4. Nunca cole esses valores em mensagens de commit, PRs, issues ou logs.
5. Variável nova ou alterada só vale no próximo deploy.

As duas são validadas quando o servidor sobe (`src/lib/env.ts`): se faltar
alguma ou o formato estiver errado, o processo não inicia e o log mostra
`[env] Configuração de ambiente inválida` com o nome da variável — nunca o
valor.

## 3. Migrations do banco

### 3.1 Caminho padrão: automático, via GitHub Actions

Todo push na `main` dispara `.github/workflows/deploy-migrations.yml`, que
roda `npx prisma migrate deploy` contra o banco de produção. Ele é separado
do `ci.yml` (que nunca toca produção) e roda em paralelo ao deploy da Vercel.
Não roda dentro do build da Vercel de propósito: a conexão direta que o
`migrate deploy` exige costuma ser inalcançável a partir da rede da Vercel.

**Configuração única:** cadastre dois Secrets no GitHub — **Settings →
Secrets and variables → Actions → Repository secrets** — com os mesmos
valores da Vercel (seção 2):
- `PROD_DATABASE_URL` → mesmo valor de `DATABASE_URL` (pooler, 6543)
- `PROD_DIRECT_URL` → mesmo valor de `DIRECT_URL` (direta, 5432)

Depois, acompanhe a aba **Actions** a cada push na `main` para confirmar que o
job "Migrations em produção" rodou com sucesso. Na `estrutura-base` ainda não
há migrações, então o job só confirma `No pending migrations to apply.` — o
que já prova que os Secrets e a conexão estão certos.

### 3.2 Alternativa: rodar manualmente

Para depurar uma falha do workflow, rode da sua máquina, apontando para
produção:

1. Traga as variáveis de produção para o terminal, temporariamente:
   `vercel env pull .env.production.local` (CLI da Vercel logada e projeto
   linkado) ou exporte `DATABASE_URL`/`DIRECT_URL` no shell, copiando do cofre.
2. Rode:
   ```bash
   npx prisma migrate deploy
   ```
3. Apague o `.env.production.local` (ou os exports) logo depois.

⚠️ Nunca rode `npm run db:seed` contra produção: o seed de exemplo (chega em
`usuarios-e-grupos`) cria contas com senha pública no código-fonte.

## 4. Deploy e verificação

1. Dispare o deploy com um push na `main` (deploy automático da Vercel) ou
   `vercel --prod` pela CLI.
2. Abra a URL de produção (`https://<projeto>.vercel.app`): `/` deve levar a
   `/resumo`, com o topo "Caixa Comum" e as três abas.
3. **Smoke test da validação de variáveis** (uma vez, antes de divulgar a
   URL): remova temporariamente `DIRECT_URL` na Vercel e faça **Redeploy**. O
   app deve falhar ao subir e os logs de Runtime devem mostrar
   `[env] Configuração de ambiente inválida` com o nome da variável. Depois,
   restaure a variável e faça o deploy de novo.
4. Confira nos logs da Vercel que nenhum valor de `DATABASE_URL` ou
   `DIRECT_URL` aparece impresso.
5. **Instalação como app**: o PWA só é instalável em HTTPS (a Vercel já
   serve assim). No Chrome do Android, o menu mostra **Instalar app**; no
   Safari do iPhone, **Compartilhar → Adicionar à Tela de Início**.

## Checklist resumido

- [ ] Projeto Supabase criado (região São Paulo), senha no cofre
- [ ] `DATABASE_URL` = connection string do **pooler** (porta 6543, usuário `postgres.<referencia>`, `?pgbouncer=true`)
- [ ] `DIRECT_URL` = connection string **direta** (porta 5432) — diferente de `DATABASE_URL`
- [ ] As duas variáveis cadastradas em **Production** na Vercel
- [ ] `PROD_DATABASE_URL`/`PROD_DIRECT_URL` cadastrados como Secrets no GitHub
- [ ] Push na `main` → job "Migrations em produção" verde na aba Actions
- [ ] URL de produção abre em HTTPS com o topo e as abas
- [ ] Smoke test feito: deploy sem `DIRECT_URL` falha visivelmente
- [ ] Nenhum valor de segredo apareceu em logs, commits, PRs ou issues

## Quando uma nova variável de ambiente obrigatória for adicionada

Atualize os três lugares juntos, na mesma mudança:
1. O schema de validação em `src/lib/env.ts`
2. O `.env.example`
3. Este guia (uma seção nova + o checklist)
