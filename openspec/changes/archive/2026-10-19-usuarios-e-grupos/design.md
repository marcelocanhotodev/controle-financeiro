# Design: Usuários e grupos

## Context
Ver `proposal.md` e `openspec/project.md`. Parte de `estrutura-base` (projeto, Prisma sem models, testes, CI e casca da interface). O matilha-app (`C:\Projeto\matilha-app`) isola clínicas, e o Caixa Comum isola grupos. O mapeamento é quase direto:

| matilha-app | Caixa Comum |
|---|---|
| `Clinica` | `Grupo` |
| `UsuarioClinica` (papel por clínica) | `Participacao` (papel por grupo) |
| `getClinicaAtual()` em `src/lib/tenant.ts` | `getGrupoAtual()` em `src/lib/grupo-atual.ts` |
| `exigirAdmin()` em `src/lib/rbac.ts` | `exigirAdmin()` em `src/lib/rbac.ts` |
| `clinicaAtivaId` no JWT + `use-trocar-clinica.ts` | `Usuario.grupoAtivoId` no banco, sem hook de troca (ver "Grupo ativo no banco") |
| `Convite` com token e `/convite/[token]` | igual, estendido a quem já tem conta |
| `isolamento-*.test.ts` | `isolamento-*.test.ts` |

## Goals / Non-Goals
Goals:
- Um único ponto de decisão de acesso a dados de grupo (`getGrupoAtual()`), que `lancamentos` e `resumo-mensal` vão reutilizar
- Um membro removido perde o acesso na hora

Non-Goals:
- Segunda camada de proteção no banco (RLS)
- Revogação avulsa de sessões ("sair de todos os aparelhos"). O acesso a cada grupo é conferido no banco, e as sessões só caem em bloco quando a senha é redefinida
- Limite de tentativas de login

## Decisions

### Decision: Auth.js v5 com Credentials, bcrypt e sessão JWT
Escolhido: copiar `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/middleware.ts`, `src/lib/rotas-protegidas.ts` e `src/types/next-auth.d.ts` do matilha-app, trocando clínica por grupo e removendo plano e assinatura.
- `auth.config.ts` (Edge) não importa Prisma nem bcrypt. `auth.ts` (Node) tem o provider e o callback `jwt`.
- O token guarda só o `id` da pessoa, como string, e `emitidoEm` (ms, gravado no callback `jwt` só quando `user` está presente, isto é, no login). A conversão para `number` acontece num único lugar. O grupo ativo não vai no token.
- `emitidoEm` é um claim próprio porque o Auth.js regrava o JWT ao renovar a sessão e o `iat` muda junto. Comparar com o `iat` deixaria uma sessão antiga sobreviver à redefinição de senha.
- `authorize()` devolve `null` tanto para e-mail inexistente quanto para senha errada.
- E-mail sempre gravado e comparado em minúsculas.
- `middleware.ts`: sem sessão leva a `/login`. Rotas públicas: `/login`, `/criar-conta`, `/esqueci-senha`, `/definir-senha/*` e `/convite/*`.
- Logout com `signOut()`, que apaga o cookie de sessão.
Alternativa descartada: Supabase Auth. Daria limite de tentativas de graça, mas foge do padrão do matilha-app.

### Decision: `getUsuarioAtual()` confere a sessão no banco
Escolhido: `src/lib/usuario-atual.ts` com `getUsuarioAtual()`, chamado por toda Server Action e página interna (direta ou indiretamente). Lê `id` e `emitidoEm` da sessão e busca o `Usuario`. Recusa, levando a `/login`, quando não há sessão, quando o usuário não existe mais ou quando `emitidoEm < senhaAlteradaEm`.
- Assim a redefinição de senha derruba as sessões de outros aparelhos na próxima ação delas. O aparelho em que a senha foi redefinida faz um `signIn` novo logo depois e recebe um `emitidoEm` posterior.
- O middleware (Edge, sem Prisma) só confere se existe sessão. A conferência no banco é dele.
- `getGrupoAtual()` se apoia nele e continua com uma única consulta (usuário + participação no grupo ativo).

### Decision: Grupo ativo no banco, com fallback em `getGrupoAtual()`
Escolhido: o grupo ativo fica só em `Usuario.grupoAtivoId`, e o banco é a única fonte. `getGrupoAtual()` parte de `getUsuarioAtual()` e, na mesma consulta, busca a `Participacao` (pessoa, grupo ativo).
- Participa: devolve `{ grupoId, papel }`.
- Não participa mais (foi removida ou o grupo foi excluído) ou `grupoAtivoId` vazio: aplica o fallback. Escolhe a participação mais antiga (menor `entrouEm`, com `grupoId` como desempate), grava em `grupoAtivoId` e devolve `{ grupoId, papel, trocouDe }`. `trocouDe` traz o nome do grupo anterior, lido antes do fallback, quando esse grupo ainda existe.
- Sem nenhuma participação: grava `grupoAtivoId = null` e lança `SemGrupoAtivoError`, que a interface trata mostrando o estado "sem grupo".
O layout do dashboard mostra `trocouDe` uma vez como aviso: `Você não participa mais de "<grupo>".` Como o fallback grava o novo grupo, o aviso não se repete nas requisições seguintes.
Troca de grupo: a Server Action `trocarGrupoAtivo(grupoId)` confere a participação, grava `Usuario.grupoAtivoId` e o cliente chama `router.refresh()`. Não há `useSession().update()`, hook de troca nem conferência no callback `jwt`.
Saída do grupo ativo: `sairDoGrupo` aplica o mesmo fallback na própria transação. O aviso fica sendo "Você saiu do grupo.", sem `trocouDe`.
Login: não resolve nada. A primeira chamada a `getGrupoAtual()` aplica a mesma regra.
Diferença em relação ao matilha-app: lá, `clinicaAtivaId` fica no JWT e `getClinicaAtual()` confia nele. Aqui o JWT não tem como ser regravado num Server Component, então guardar o grupo ativo nele deixaria o token e o banco divergirem depois de uma remoção.
Consequência aceita: o grupo ativo vale por conta, não por aparelho. Trocar de grupo no celular troca também no notebook, a partir da próxima ação feita nele.
Alternativa descartada: manter `grupoAtivoId` no JWT e corrigir o token pelo cliente depois do fallback. Daria um grupo ativo por aparelho, ao custo de duas fontes que podem divergir.

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
| `aceitarConvite` | `actions/convite.ts` | autenticado com o e-mail do convite |
| `pedirRedefinicaoSenha` | `actions/senha.ts` | público |
| `definirSenha` | `actions/senha.ts` | quem tem um link de definir senha válido |

### Decision: Operações de vários passos com `prisma.$transaction`
Escolhido: cadastro (usuário + grupo ou participação), criação de conta pelo link de definir senha (usuário + participação + aceite do convite + token usado), redefinição de senha (senha + `senhaAlteradaEm` + token usado + invalidação dos outros tokens), criação de grupo, entrada por código, aceite de convite, remoção de membro e saída do grupo (promoção do membro mais antigo e exclusão do grupo vazio) rodam em `prisma.$transaction`. Como conta e participação nascem juntas, um cadastro recusado não deixa resíduo.
Membro mais antigo: menor `entrouEm`, com `usuarioId` como desempate.

### Decision: Convite por link com token para todo mundo
Escolhido: estender `src/lib/actions/convite.ts` e `src/app/(auth)/convite/[token]` do matilha-app.
- `convidar(email)`: só pede o e-mail. Recusa se o e-mail já é membro. Se já existe convite pendente para o e-mail no grupo, reaproveita e reenvia. Senão, cria `Convite` com token de `crypto.randomBytes` e `expiraEm = agora + 7 dias`, envia o e-mail e grava `envioStatus`. A mensagem ao Administrador é a mesma, tenha o e-mail conta ou não.
- O link do e-mail depende de o e-mail ter conta **no momento do envio**:
  - Com conta: `/convite/[token]`.
  - Sem conta: cria um `TokenSenha` CRIAR ligado ao convite, com a mesma validade, e o link é `/definir-senha/[t]` (ver "Link de definir senha").
  - O reenvio decide de novo. Se continua sem conta, gera outro `TokenSenha` e invalida o anterior, porque o valor puro não fica guardado.
- `/convite/[token]`: o token precisa existir, não ter expirado e não ter sido aceito.
  - Logado com o mesmo e-mail: botão "Entrar no grupo".
  - Logado com outro e-mail: recusa e oferece sair.
  - Não logado: login e volta ao link. Se a pessoa não tiver conta, o login não resolve, mas esse link só é enviado a quem já tinha conta.
- `aceitarConvite`: exige sessão com o e-mail do convite. Em transação, cria a `Participacao` como Membro, marca `aceitoEm` e grava o grupo como `grupoAtivoId`.
Diferença em relação ao matilha-app: lá, convidar e-mail que já tem conta é recusado. Aqui é o caso comum, porque a mesma pessoa participa da casa e da viagem.
Por quê: abrir o link prova a posse do e-mail e evita revelar ao Administrador se o e-mail tem conta.

### Decision: Link de definir senha, único para criar conta e redefinir senha
Escolhido: uma tabela `TokenSenha` com `finalidade` CRIAR ou REDEFINIR e uma única página pública, `/definir-senha/[t]`. Quem cria a conta não define a senha: o Administrador só informa o e-mail, e a pessoa convidada informa nome e senha pelo link.
- Token: 32 bytes de `crypto.randomBytes`. O banco guarda só o `sha256` (`tokenHash`), e o valor puro só existe no e-mail. Diferente do `Convite`, cujo token fica em texto como no matilha-app, porque este link entrega uma senha.
- Validade: CRIAR acompanha o convite (7 dias, renovados no reenvio). REDEFINIR vale 1 hora.
- Uso único: usar um token marca `usadoEm`. Usar um REDEFINIR invalida os outros REDEFINIR pendentes da conta. Os CRIAR são por convite: o reenvio invalida o anterior do mesmo convite, e os CRIAR de convites de outros grupos para o mesmo e-mail continuam válidos. Quando um deles é aberto depois de a conta já existir, cai no caso de corrida abaixo.
- Link inválido (inexistente, expirado, usado ou do convite cancelado): "Este link não é mais válido." Em REDEFINIR, oferece pedir um novo link. Em CRIAR, orienta a pedir um novo convite.
- CRIAR, em `definirSenha`: a página mostra o e-mail do convite sem permitir edição e pede nome e senha (mínimo 8). O e-mail vem do convite no servidor, e o schema Zod nem aceita `email`. Em transação: cria o `Usuario`, cria a `Participacao` como Membro, marca `aceitoEm`, grava `grupoAtivoId` e marca o token como usado. Depois, o cliente chama `signIn`. Nenhum grupo "Grupo de <nome>" é criado.
- CRIAR, corrida: se o e-mail ganhou conta depois do envio (pela tela "Criar conta"), a página mostra "Este e-mail já tem conta. Entre para aceitar o convite." e leva ao login com volta para `/convite/[token]`. Isso não vaza nada, porque quem tem o link já provou ser dono do e-mail.
- REDEFINIR: `/esqueci-senha` pede o e-mail e sempre responde "Se houver uma conta com este e-mail, enviamos um link." Só cria o token e envia o e-mail se a conta existir, e no máximo um pedido a cada 60 s por conta. Em `definirSenha`, a página pede só a nova senha. Em transação: grava `senhaHash` e `senhaAlteradaEm = agora`, marca o token como usado e invalida os outros REDEFINIR da conta. Depois, o cliente chama `signIn`, e as sessões dos outros aparelhos caem (ver `getUsuarioAtual()`).
- A tela "Entrar" ganha o link "Esqueci minha senha".
Alternativa descartada: criar a conta no momento do convite, sem senha, com o nome informado pelo Administrador. Deixaria contas sem senha para limpar quando o convite expira e tornaria `senhaHash` opcional.
Alternativa descartada: uma action de aceite que também cria a conta com senha, como no matilha-app. Seria a pessoa definindo a senha dentro do convite, sem o link compartilhado com a recuperação de senha.

### Decision: E-mail com nodemailer e SMTP
Escolhido: copiar `src/lib/email.ts` do matilha-app. Sem `SMTP_HOST`, o link é impresso no console. O e-mail de convite traz o nome do grupo, quem convidou, o link (de convite ou de definir senha) e a validade. O e-mail de redefinição traz o link e a validade de 1 hora. Falha de envio não apaga o convite: fica `FALHOU` e pode ser reenviado. Na redefinição, a falha é registrada no log, e a resposta na tela continua a mesma.

### Decision: Código do grupo
Escolhido: até 6 letras do nome, sem acentos e em maiúsculas, mais um hífen e 4 dígitos aleatórios (ex.: `VIAGEM-4821`). Em conflito de `@unique`, tenta de novo. A busca por código é feita em maiúsculas.

## Data Model
```prisma
enum PapelGrupo { ADMIN MEMBRO }
enum EnvioConviteStatus { ENVIADO FALHOU }
enum FinalidadeTokenSenha { CRIAR REDEFINIR }

model Usuario {
  id                 Int      @id @default(autoincrement())
  nome               String
  email              String   @unique // sempre em minúsculas
  senhaHash          String
  grupoAtivoId       Int?     // sem FK: getGrupoAtual() confere a participação
  senhaAlteradaEm    DateTime? // sessões emitidas antes disso são recusadas
  criadoEm           DateTime @default(now())
  participacoes      Participacao[]
  convitesCriados    Convite[] @relation("ConviteCriadoPor")
  tokensSenha        TokenSenha[]
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
  tokensSenha TokenSenha[]
  @@index([grupoId])
  @@map("convites")
}

model TokenSenha {
  id         Int                  @id @default(autoincrement())
  tokenHash  String               @unique // sha256 do valor enviado por e-mail
  finalidade FinalidadeTokenSenha
  email      String               // minúsculas
  usuarioId  Int?                 // REDEFINIR
  conviteId  Int?                 // CRIAR
  criadoEm   DateTime             @default(now())
  expiraEm   DateTime
  usadoEm    DateTime?
  usuario    Usuario? @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  convite    Convite? @relation(fields: [conviteId], references: [id], onDelete: Cascade)
  @@index([usuarioId])
  @@index([conviteId])
  @@map("tokens_senha")
}
```

## File Changes
```
src/app/(auth)/login/  criar-conta/  convite/[token]/  esqueci-senha/  definir-senha/[token]/  moldura-auth.tsx
src/app/(dashboard)/grupo/              aba Grupo
src/app/(dashboard)/layout.tsx          + seletor de grupo, pessoa e "Sair"
src/app/api/auth/[...nextauth]/route.ts
src/middleware.ts
src/lib/auth.ts  auth.config.ts  rotas-protegidas.ts  usuario-atual.ts  grupo-atual.ts  rbac.ts  email.ts  token-senha.ts
src/lib/actions/cadastro.ts  grupo.ts  convite.ts  senha.ts
src/lib/validators/cadastro.ts  grupo.ts  convite.ts  senha.ts
src/lib/isolamento-grupo.test.ts  isolamento-convite.test.ts
src/types/next-auth.d.ts
prisma/migrations/<data>_usuarios_e_grupos/
prisma/seed.ts
```

## Risks / Trade-offs
- [Sem RLS, um `findMany` sem `grupoId` vaza dados] → helper único, `where: { id, grupoId }` como regra de revisão e teste de isolamento obrigatório por recurso.
- [O JWT não pode ser revogado antes de expirar] → `getGrupoAtual()` confere a participação no banco a cada ação, e `getUsuarioAtual()` recusa sessões emitidas antes da última redefinição de senha.
- [O link de redefinição vaza se o e-mail for encaminhado ou a caixa de e-mail for invadida] → validade de 1 hora, uso único e só o hash no banco. Caixa de e-mail invadida fica fora do alcance do app.
- [Sem SMTP em produção, ninguém redefine senha nem cria conta por convite] → `SMTP_*` obrigatórios em produção (tarefa 1.1). A pessoa convidada ainda pode entrar pelo código do grupo.
- [O tempo de resposta de `/esqueci-senha` pode revelar se o e-mail tem conta, porque só há envio quando ela existe] → aceito no MVP. A mensagem é sempre a mesma.
- [E-mail ocupado: o cadastro pela tela "Criar conta" não verifica o e-mail, e alguém pode criar conta com o e-mail de outra pessoa] → em aberto. O dono do e-mail pode recuperar a conta pelo "Esqueci minha senha", mas herda o nome e os grupos de quem a criou.
- [Grupo ativo trocado sem a pessoa perceber depois de uma remoção, levando a lançamentos no grupo errado] → aviso `Você não participa mais de "<grupo>".` e o seletor do topo já mostrando o novo grupo.
- [Sem limite de tentativas de login, a senha pode ser atacada por força bruta] → aceito no MVP. Senha mínima de 8 caracteres e bcrypt reduzem o risco. Fica para uma change futura.
- [O e-mail de convite pode cair no spam] → o código do grupo continua como alternativa, e o Administrador pode reenviar.
- [O token de convite vaza se o e-mail for encaminhado] → validade de 7 dias, uso único e cancelamento.

## Migration Plan
Primeira migração com tabelas (`usuarios`, `grupos`, `participacoes`, `convites`, `tokens_senha`), aplicada em produção pelo `deploy-migrations.yml`. Antes do deploy, cadastrar na Vercel `AUTH_SECRET`, `NEXTAUTH_URL`, `SMTP_*` e `EMAIL_FROM`. Rollback: reverter o deploy. A migração é aditiva.
