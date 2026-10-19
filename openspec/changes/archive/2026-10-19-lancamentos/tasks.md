# Tasks

Referência de código: `C:\Projeto\matilha-app`. Referência de interface: `openspec/prototype/Caixa Comum.html`, aba Lançamentos.

## 1. Banco e base
- [x] 1.1 Acrescentar o model `Lancamento` e o enum `TipoLancamento` ao `schema.prisma` e gerar a migração com o `CHECK (valor > 0)`. Verificação: a migração aplica sem erro e um teste confirma que inserir `valor = 0` falha
- [x] 1.2 Criar `src/lib/format/moeda.ts` (`formatarReais` e `lerValor`) e copiar `src/lib/timezone.ts` do matilha-app. Verificação: testes unitários com "1.250,50", "1250,50", "1250.50", valores inválidos e dez somas de R$ 0,10 resultando em R$ 1,00 com `Prisma.Decimal`

## 2. Registro (`lancamentos`)
- [x] 2.1 `src/lib/categorias.ts` e `validators/lancamento.ts` com as mensagens da spec. Verificação: `lancamento.test.ts` cobre descrição vazia, valor inválido, data vazia e categoria de outro tipo
- [x] 2.2 Server Action `criarLancamento` com autor da sessão e grupo de `getGrupoAtual()`, ignorando `id`, autor e grupo enviados. Verificação: testes de autor forçado e de id e grupo ignorados
- [x] 2.3 Formulário: alternância Saída/Entrada mantendo descrição e valor, categorias e texto do botão por tipo, data padrão de hoje em America/Sao_Paulo e, depois de salvar, ir ao mês do lançamento sem filtros e mostrar o aviso com o valor. Verificação: teste Playwright registrando uma entrada e uma saída

## 3. Lista
- [x] 3.1 Leitura da lista do mês em `src/lib/lancamentos.ts`, com filtros de tipo e pessoa, ordenada por `data` e `criadoEm` decrescentes, sem `excluidoEm`, com o autor sem participação marcado como ex-membro (nome seguido de "(ex-membro)"), e opções do filtro Pessoa com os membros atuais e os ex-membros com lançamentos no mês, em ordem alfabética. Verificação: testes de ordem, filtros, filtro por ex-membro, opções do filtro e exclusão das linhas excluídas
- [x] 3.2 Seletor de mês (mês atual mais os meses com lançamentos, no formato "Outubro de 2026") e filtros pela URL, conferidos no servidor: `autor` que não é membro atual nem autor de lançamento do grupo ativo é ignorado, e `tipo` e `mes` inválidos caem no padrão. Verificação: teste da lista de meses e testes de `autor` de outro grupo, `tipo` e `mes` inválidos
- [x] 3.3 `SeletorGrupo` (`src/app/(dashboard)/seletor-grupo.tsx`) troca de grupo com `router.replace(pathname)`, sem a query. Verificação: teste Playwright trocando de grupo com filtro ativo e teste Playwright da pessoa removida do grupo filtrado, que vê os lançamentos do novo grupo
- [x] 3.4 Linhas "data, descrição, categoria · autor, valor com sinal", linhas de ex-membro com opacidade de 70%, `data-ex-membro` e "(ex-membro)" junto do nome, rodapé com quantidade e totais do que está filtrado ("lançamento" no singular), "Nenhum lançamento com esses filtros." e formulário ao lado da lista no desktop. Verificação: teste Playwright filtrando por "Saídas" nos projetos de celular e desktop, e a página com uma linha de ex-membro passando no teste de acessibilidade (axe), com a regra de contraste desligada só nas linhas `data-ex-membro` (exceção aceita no design)

## 4. Exclusão
- [x] 4.1 `excluirLancamento` (autor ou Administrador, grava `excluidoEm`) e `restaurarLancamento` (só até 60 s), com o botão oculto para quem não pode e o aviso com "Desfazer". Verificação: testes de permissão e de prazo, e teste Playwright de excluir e desfazer
- [x] 4.2 Rota `api/cron/limpar-lancamentos` com `Authorization: Bearer CRON_SECRET`, apagando o que foi excluído há mais de 24 h, e cron diário em `vercel.json`. Sem `CRON_SECRET` no ambiente, a rota recusa toda chamada. Verificação: `route.test.ts` no modelo de `lembretes-whatsapp/route.test.ts` (401 sem cabeçalho, 401 com segredo errado, 401 com `CRON_SECRET` ausente no ambiente, apaga só o que passou de 24 h)
- [x] 4.3 Nome acessível do botão de excluir com a descrição do lançamento ("Excluir Mercado"). Verificação: teste Playwright localizando o botão com `getByRole('button', { name: 'Excluir Mercado' })`

## 5. Segurança, dados de exemplo e publicação
- [x] 5.1 `isolamento-lancamento.test.ts`: listar, criar, excluir e restaurar com ids de outro grupo se comportam como inexistentes, inclusive percorrendo ids sequenciais, a pessoa removida do grupo é recusada sem novo login e o grupo excluído leva junto os lançamentos
- [x] 5.2 Acrescentar ao `prisma/seed.ts` 6 meses de lançamentos dos grupos de exemplo, como no protótipo. Verificação: `npm run db:seed` popula e a lista de outubro bate com a do protótipo
- [x] 5.3 Revisar os textos da aba Lançamentos em português do Brasil contra a spec e o protótipo
- [ ] 5.4 Configurar o ambiente de produção com `CRON_SECRET`: obrigatório em produção em `src/lib/env.ts` (com caso novo em `env.test.ts`), `.env.example`, `docs/deploy-producao.md` (seção e checklist), `env` do servidor dos testes em `playwright.config.ts` e cadastro na Vercel; depois, publicar. Verificação: registrar, excluir e desfazer funcionam na URL de produção e o cron aparece no painel da Vercel

## Workflow follow-up
- Rodar `openspec validate lancamentos --strict` e arquivar a change antes de começar `resumo-mensal`.
