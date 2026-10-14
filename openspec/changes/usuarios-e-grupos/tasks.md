# Tasks

Referência de código: `C:\Projeto\matilha-app`. Referência de interface: `openspec/prototype/Caixa Comum.html`.

## 1. Banco e configuração
- [ ] 1.1 Acrescentar `AUTH_SECRET`, `NEXTAUTH_URL`, `SMTP_*` e `EMAIL_FROM` a `src/lib/env.ts` e `.env.example`, com `SMTP_*`, `EMAIL_FROM` obrigatórios só em produção e recusa do `AUTH_SECRET` padrão de desenvolvimento em produção. Verificação: casos novos em `env.test.ts`
- [ ] 1.2 Acrescentar ao `schema.prisma` os models `Usuario`, `Grupo`, `Participacao` e `Convite` do design, gerar a migração e devolver ao `package.json` o `postinstall: prisma generate` (fora da `estrutura-base` porque o Prisma 5 não gera client sem models). Verificação: `npx prisma migrate dev` aplica sem erro, `npm ci` gera o client e o CI aplica a migração em banco limpo

## 2. Autenticação (`autenticacao`)
- [ ] 2.1 Copiar e adaptar `auth.config.ts`, `auth.ts`, `types/next-auth.d.ts` e `api/auth/[...nextauth]/route.ts`: Credentials com bcrypt, e-mail em minúsculas, token com `id` e `grupoAtivoId`, sem plano. Verificação: teste do `authorize` devolve `null` igual para e-mail inexistente e para senha errada
- [ ] 2.2 Resolver o grupo ativo no login (`ultimoGrupoAtivoId` se ainda for membro, senão a participação mais antiga, senão vazio), no modelo de `src/lib/clinica-selecao.ts`. Verificação: testes para os três casos
- [ ] 2.3 Copiar `src/middleware.ts` e `src/lib/rotas-protegidas.ts`, com `/login`, `/criar-conta` e `/convite/*` públicas. Verificação: `rotas-protegidas.test.ts` cobre página interna sem sessão e páginas públicas
- [ ] 2.4 `validators/cadastro.ts` e Server Action `cadastrar`: em `$transaction`, cria o `Usuario` com `senhaHash` e entra no grupo pelo código ou cria "Grupo de <primeiro nome>" como Administradora; depois chama `signIn`. Verificação: testes para cadastro válido, e-mail repetido com maiúsculas, código válido e inexistente (sem resíduo no banco) e convite pendente para o mesmo e-mail que não é resolvido
- [ ] 2.5 Tela de login com "Entrar" e "Criar conta" (`moldura-auth.tsx` no modelo do matilha-app), mensagem única "E-mail ou senha incorretos.", erros com `role="alert"` e foco no campo com problema. Verificação: teste Playwright de cadastro, logout e login
- [ ] 2.6 Logout com `signOut()`. Verificação: teste Playwright confirma que, depois de sair, voltar a `/resumo` leva a `/login`
- [ ] 2.7 Teste de segurança da senha: nenhuma coluna contém a senha em texto, `senhaHash` começa com `$2`, e nem a sessão nem os retornos das actions contêm `senhaHash`

## 3. Grupos (`grupos`)
- [ ] 3.1 `src/lib/grupo-atual.ts` com `getGrupoAtual()` e `src/lib/rbac.ts` com `exigirAdmin()`. Verificação: testes com participação válida, sem grupo ativo e com participação removida depois do login
- [ ] 3.2 `criarGrupo` e `entrarPorCodigo`, com geração do código e nova tentativa em conflito, código sem diferenciar maiúsculas e "já participa". Verificação: testes de cada cenário da spec
- [ ] 3.3 `trocarGrupoAtivo`, `use-trocar-grupo.ts` e callback `jwt` que confere a participação antes de aceitar `grupoAtivoId`. Verificação: teste de que trocar para grupo sem participação não muda o token
- [ ] 3.4 Barra superior com seletor de grupo, inicial e nome da pessoa e "Sair", sem seletor para quem não tem grupo. Verificação: teste Playwright trocando de grupo pelo seletor
- [ ] 3.5 Copiar `src/lib/email.ts` e adaptar o e-mail de convite (grupo, quem convidou, link, validade). Verificação: `email.test.ts` no modelo do matilha-app, incluindo o link no console sem SMTP
- [ ] 3.6 `convidar`, `reenviarConvite` e `cancelarConvite`, com token aleatório, 7 dias, reaproveitamento do convite pendente, `envioStatus` e mesma mensagem com e sem conta. Verificação: testes para e-mail inválido, já membro, repetido, falha de envio, Membro comum recusado e mesma mensagem com e sem conta
- [ ] 3.7 Página `(auth)/convite/[token]` e `aceitarConvite` nos quatro casos (mesmo e-mail, outro e-mail, conta sem login, sem conta), com participação e `aceitoEm` em `$transaction`. Verificação: testes para expirado, aceito, cancelado, inexistente e já participa, mais teste Playwright do convite para uma pessoa sem conta
- [ ] 3.8 Aba Grupo: "Membros (n)" com selos e "(você)", convites pendentes com "Reenviar" e "Cancelar convite" só para Administradores, código com "Copiar" e plano B de seleção do texto. Verificação: teste Playwright com Administradora e com Membro
- [ ] 3.9 `removerMembro` e `sairDoGrupo` em `$transaction`: confirmação em dois passos, sem botão para remover a si mesma, promoção do membro mais antigo e exclusão do grupo vazio. Verificação: testes de cada cenário e de que o Membro comum é recusado
- [ ] 3.10 Estado "sem grupo" na aba Grupo com os formulários de criar e de entrar por código, e Resumo e Lançamentos sem dados. Verificação: teste Playwright depois de sair do único grupo
- [ ] 3.11 `isolamento-grupo.test.ts` e `isolamento-convite.test.ts` no modelo de `isolamento-clinica.test.ts`: com a sessão do grupo A, ids do grupo B se comportam como inexistentes, e um campo `id` enviado nas actions é ignorado

## 4. Dados de exemplo e publicação
- [ ] 4.1 `prisma/seed.ts` só para desenvolvimento (recusa rodar com `NODE_ENV=production`): contas Marcelo (Administrador), Ana e Pedro e os grupos "Finanças da Casa" e "Viagem de Dezembro", como no protótipo. Verificação: `npm run db:seed` roda duas vezes sem erro e as três contas entram
- [ ] 4.2 Revisar os textos de login, cadastro, convite e aba Grupo em português do Brasil contra as specs e o protótipo
- [ ] 4.3 Publicar em produção com as variáveis novas. Verificação: cadastro, convite por e-mail e login funcionam na URL de produção

## Workflow follow-up
- Rodar `openspec validate usuarios-e-grupos --strict` e arquivar a change antes de começar `lancamentos`.
