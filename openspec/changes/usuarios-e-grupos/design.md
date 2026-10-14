# Design: Usuários e grupos

## Context
Ver `proposal.md` e `openspec/project.md`. Parte de `estrutura-base` (projeto, Prisma sem models, testes, CI e casca da interface). O matilha-app (`C:\Projeto\matilha-app`) isola clínicas, e o Caixa Comum isola grupos. O mapeamento é quase direto:

| matilha-app | Caixa Comum |
|---|---|
| `Clinica` | `Grupo` |
| `UsuarioClinica` (papel por clínica) | `Participacao` (papel por grupo) |
| `getClinicaAtual()` em `src/lib/tenant.ts` | `getGrupoAtual()` em `src/lib/grupo-atual.ts` |
| `exigirAdmin()` em `src/lib/rbac.ts` | `exigirAdmin()` em `src/lib/rbac.ts` |
| `clinicaAtivaId` no JWT + `use-trocar-clinica.ts` | `grupoAtivoId` no JWT + `use-trocar-grupo.ts` |
| `Convite` com token e `/convite/[token]` | igual, estendido a quem já tem conta |
| `isolamento-*.test.ts` | `isolamento-*.test.ts` |

## Goals / Non-Goals
Goals:
- Um único ponto de decisão de acesso a dados de grupo (`getGrupoAtual()`), que `lancamentos` e `resumo-mensal` vão reutilizar
- Um membro removido perde o acesso na hora

Non-Goals:
- Segunda camada de proteção no banco (RLS)
- Revogação da sessão JWT antes de expirar. O acesso a cada grupo é conferido no banco, a sessão em si não
- Limite de tentativas de login

## Decisions

### Decision: Auth.js v5 com Credentials, bcrypt e sessão JWT
Escolhido: copiar `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/middleware.ts`, `src/lib/rotas-protegidas.ts` e `src/types/next-auth.d.ts` do matilha-app, trocando clínica por grupo e removendo plano e assinatura.
- `auth.config.ts` (Edge) não importa Prisma nem bcrypt. `auth.ts` (Node) tem o provider e o callback `jwt`.
- O token guarda `id` e `grupoAtivoId` como string. A conversão para `number` acontece num único lugar.
- `authorize()` devolve `null` tanto para e-mail inexistente quanto para senha errada.
- E-mail sempre gravado e comparado em minúsculas.
- `middleware.ts`: sem sessão leva a `/login`. Rotas públicas: `/login`, `/criar-conta` e `/convite/*`.
- Logout com `signOut()`, que apaga o cookie de sessão.
Alternativa descartada: Supabase Auth. Daria limite de tentativas de graça, mas foge do padrão do matilha-app.

### Decision: Grupo ativo no JWT, conferido no banco a cada ação
Escolhido: `getGrupoAtual()` lê `grupoAtivoId` da sessão e busca a `Participacao` (pessoa, grupo) no banco. Devolve `{ grupoId, papel }` ou lança `SemGrupoAtivoError`, que a interface trata mostrando o estado "sem grupo".
Diferença em relação ao matilha-app: lá, `getClinicaAtual()` confia no JWT. Aqui a consulta extra (uma busca por chave primária) é obrigatória para que a remoção valha na hora.
Troca de grupo: a Server Action `trocarGrupoAtivo(grupoId)` confere a participação e grava `Usuario.ultimoGrupoAtivoId`. Depois, o cliente chama `useSession().update({ grupoAtivoId })`, e o callback `jwt` confere de novo antes de aceitar, no padrão de `use-trocar-clinica.ts`.
No login: `grupoAtivoId` recebe `ultimoGrupoAtivoId` se a pessoa ainda participa desse grupo. Se não, recebe a participação mais antiga. Se ela não tem grupo, fica vazio.

### Decision: Isolamento por helper único e testes, sem RLS
Escolhido: toda leitura e escrita de dados de grupo usa `grupoId` vindo de `getGrupoAtual()`. Ids recebidos do cliente entram sempre junto do grupo: `where: { id, grupoId }`. Se nada for encontrado, a resposta é a mesma de um registro inexistente. Cada recurso tem um `isolamento-<recurso>.test.ts` no modelo de `src/lib/isolamento-clinica.test.ts`.
Alternativa descartada: Prisma Client Extension que injeta `grupoId` automaticamente. Esconde o filtro e foge do padrão do matilha-app.

### Decision: Server Actions
Escolhido: escritas em `src/lib/actions/*.ts` com `"use server"`, no padrão de `src/lib/actions/convite.ts`. Cada ação valida com Zod (sem aceitar `id`), chama `getGrupoAtual()` ou `exigirAdmin()` de novo e devolve `{ ok, erro? }`. Leituras ficam em Server Components.

| Server Action | Arquivo | Quem pode |
|---|---|---|
| `cadastrar` | `actions/cadastro.ts` | público |
| `criarGrupo`, `entrarPorCodigo`, `trocarGrupoAtivo` | `actions/grupo.ts` | autenticado |
| `sairDoGrupo` | `actions/grupo.ts` | membro |
| `removerMembro` | `actions/grupo.ts` | Administrador |
| `convidar`, `reenviarConvite`, `cancelarConvite` | `actions/convite.ts` | Administrador |
| `aceitarConvite` | `actions/convite.ts` | quem tem o token (com ou sem conta) |

### Decision: Operações de vários passos com `prisma.$transaction`
Escolhido: cadastro (usuário + grupo ou participação), criação de grupo, entrada por código, aceite de convite, remoção de membro e saída do grupo (promoção do membro mais antigo e exclusão do grupo vazio) rodam em `prisma.$transaction`. Como conta e participação nascem juntas, um cadastro recusado não deixa resíduo.
Membro mais antigo: menor `entrouEm`, com `usuarioId` como desempate.

### Decision: Convite por link com token para todo mundo
Escolhido: estender `src/lib/actions/convite.ts` e `src/app/(auth)/convite/[token]` do matilha-app.
- `convidar(email)`: recusa se o e-mail já é membro. Se já existe convite pendente para o e-mail no grupo, reaproveita e reenvia. Senão, cria `Convite` com token de `crypto.randomBytes` e `expiraEm = agora + 7 dias`, envia o e-mail e grava `envioStatus`. A mensagem ao Administrador é a mesma, tenha o e-mail conta ou não.
- `/convite/[token]`: o token precisa existir, não ter expirado e não ter sido aceito.
  - Logado com o mesmo e-mail: botão "Entrar no grupo".
  - Logado com outro e-mail: recusa e oferece sair.
  - Não logado, com conta: login e volta ao link.
  - Não logado, sem conta: cadastro com o e-mail travado.
- `aceitarConvite`: em transação, cria a `Participacao` como Membro e marca `aceitoEm`. Depois, o grupo vira o ativo.
Diferença em relação ao matilha-app: lá, convidar e-mail que já tem conta é recusado. Aqui é o caso comum, porque a mesma pessoa participa da casa e da viagem.
Por quê: abrir o link prova a posse do e-mail e evita revelar ao Administrador se o e-mail tem conta.

### Decision: E-mail com nodemailer e SMTP
Escolhido: copiar `src/lib/email.ts` do matilha-app. Sem `SMTP_HOST`, o link é impresso no console. O e-mail traz o nome do grupo, quem convidou, o link e a validade. Falha de envio não apaga o convite: fica `FALHOU` e pode ser reenviado.

### Decision: Código do grupo
Escolhido: até 6 letras do nome, sem acentos e em maiúsculas, mais um hífen e 4 dígitos aleatórios (ex.: `VIAGEM-4821`). Em conflito de `@unique`, tenta de novo. A busca por código é feita em maiúsculas.

## Data Model
```prisma
enum PapelGrupo { ADMIN MEMBRO }
enum EnvioConviteStatus { ENVIADO FALHOU }

model Usuario {
  id                 Int      @id @default(autoincrement())
  nome               String
  email              String   @unique // sempre em minúsculas
  senhaHash          String
  ultimoGrupoAtivoId Int?
  criadoEm           DateTime @default(now())
  participacoes      Participacao[]
  convitesCriados    Convite[] @relation("ConviteCriadoPor")
  @@map("usuarios")
}

model Grupo {
  id            Int      @id @default(autoincrement())
  nome          String
  codigo        String   @unique
  criadoEm      DateTime @default(now())
  participacoes Participacao[]
  convites      Convite[]
  @@map("grupos")
}

model Participacao {
  usuarioId Int
  grupoId   Int
  papel     PapelGrupo
  entrouEm  DateTime @default(now())
  usuario   Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  grupo     Grupo   @relation(fields: [grupoId], references: [id], onDelete: Cascade)
  @@id([usuarioId, grupoId])
  @@index([grupoId])
  @@map("participacoes")
}

model Convite {
  id          Int       @id @default(autoincrement())
  grupoId     Int
  email       String    // minúsculas
  token       String    @unique
  criadoPorId Int
  criadoEm    DateTime  @default(now())
  expiraEm    DateTime
  aceitoEm    DateTime?
  envioStatus EnvioConviteStatus?
  envioErro   String?
  envioEm     DateTime?
  grupo       Grupo   @relation(fields: [grupoId], references: [id], onDelete: Cascade)
  criadoPor   Usuario @relation("ConviteCriadoPor", fields: [criadoPorId], references: [id], onDelete: Restrict)
  @@index([grupoId])
  @@map("convites")
}
```

## File Changes
```
src/app/(auth)/login/  criar-conta/  convite/[token]/  moldura-auth.tsx
src/app/(dashboard)/grupo/              aba Grupo
src/app/(dashboard)/layout.tsx          + seletor de grupo, pessoa e "Sair"
src/app/api/auth/[...nextauth]/route.ts
src/middleware.ts
src/lib/auth.ts  auth.config.ts  rotas-protegidas.ts  grupo-atual.ts  rbac.ts  email.ts
src/lib/actions/cadastro.ts  grupo.ts  convite.ts
src/lib/validators/cadastro.ts  grupo.ts  convite.ts
src/lib/hooks/use-trocar-grupo.ts
src/lib/isolamento-grupo.test.ts  isolamento-convite.test.ts
src/types/next-auth.d.ts
prisma/migrations/<data>_usuarios_e_grupos/
prisma/seed.ts
```

## Risks / Trade-offs
- [Sem RLS, um `findMany` sem `grupoId` vaza dados] → helper único, `where: { id, grupoId }` como regra de revisão e teste de isolamento obrigatório por recurso.
- [O JWT não pode ser revogado antes de expirar] → `getGrupoAtual()` confere a participação no banco a cada ação.
- [Sem limite de tentativas de login, a senha pode ser atacada por força bruta] → aceito no MVP. Senha mínima de 8 caracteres e bcrypt reduzem o risco. Fica para uma change futura.
- [O e-mail de convite pode cair no spam] → o código do grupo continua como alternativa, e o Administrador pode reenviar.
- [O token de convite vaza se o e-mail for encaminhado] → validade de 7 dias, uso único e cancelamento.

## Migration Plan
Primeira migração com tabelas (`usuarios`, `grupos`, `participacoes`, `convites`), aplicada em produção pelo `deploy-migrations.yml`. Antes do deploy, cadastrar na Vercel `AUTH_SECRET`, `NEXTAUTH_URL`, `SMTP_*` e `EMAIL_FROM`. Rollback: reverter o deploy. A migração é aditiva.
