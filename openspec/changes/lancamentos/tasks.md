# Tasks

Referência de código: `C:\Projeto\matilha-app`. Referência de interface: `openspec/prototype/Caixa Comum.html`, aba Lançamentos.

## 1. Banco e base
- [ ] 1.1 Acrescentar o model `Lancamento` e o enum `TipoLancamento` ao `schema.prisma` e gerar a migração com o `CHECK (valor > 0)`. Verificação: a migração aplica sem erro e um teste confirma que inserir `valor = 0` falha
- [ ] 1.2 Criar `src/lib/format/moeda.ts` (`formatarReais` e `lerValor`) e copiar `src/lib/timezone.ts` do matilha-app. Verificação: testes unitários com "1.250,50", "1250,50", "1250.50", valores inválidos e dez somas de R$ 0,10 resultando em R$ 1,00 com `Prisma.Decimal`
- [ ] 1.3 Acrescentar `CRON_SECRET` (obrigatório em produção) a `src/lib/env.ts` e `.env.example`. Verificação: caso novo em `env.test.ts`

## 2. Registro (`lancamentos`)
- [ ] 2.1 `src/lib/categorias.ts` e `validators/lancamento.ts` com as mensagens da spec. Verificação: `lancamento.test.ts` cobre descrição vazia, valor inválido, data vazia e categoria de outro tipo
- [ ] 2.2 Server Action `criarLancamento` com autor da sessão e grupo de `getGrupoAtual()`, ignorando `id`, autor e grupo enviados. Verificação: testes de autor forçado e de id e grupo ignorados
- [ ] 2.3 Formulário: alternância Saída/Entrada mantendo descrição e valor, categorias e texto do botão por tipo, data padrão de hoje em America/Sao_Paulo e, depois de salvar, ir ao mês do lançamento sem filtros e mostrar o aviso com o valor. Verificação: teste Playwright registrando uma entrada e uma saída

## 3. Lista
- [ ] 3.1 Leitura da lista do mês em `src/lib/lancamentos.ts`, com filtros de tipo e pessoa, ordenada por `data` e `criadoEm` decrescentes, sem `excluidoEm`, com "Ex-membro" para autor sem participação. Verificação: testes de ordem, filtros, ex-membro e exclusão das linhas excluídas
- [ ] 3.2 Seletor de mês (mês atual mais os meses com lançamentos, no formato "Outubro de 2026") e filtros pela URL, que voltam para "Todos" ao trocar de grupo. Verificação: teste da lista de meses e teste Playwright trocando de grupo com filtro ativo
- [ ] 3.3 Linhas "data, descrição, categoria · autor, valor com sinal", rodapé com quantidade e totais do que está filtrado ("lançamento" no singular), "Nenhum lançamento com esses filtros." e formulário ao lado da lista no desktop. Verificação: teste Playwright filtrando por "Saídas" nos projetos de celular e desktop

## 4. Exclusão
- [ ] 4.1 `excluirLancamento` (autor ou Administrador, grava `excluidoEm`) e `restaurarLancamento` (só até 60 s), com o botão oculto para quem não pode e o aviso com "Desfazer". Verificação: testes de permissão e de prazo, e teste Playwright de excluir e desfazer
- [ ] 4.2 Rota `api/cron/limpar-lancamentos` com `Authorization: Bearer CRON_SECRET`, apagando o que foi excluído há mais de 24 h, e cron diário em `vercel.json`. Verificação: `route.test.ts` no modelo de `lembretes-whatsapp/route.test.ts` (401 sem segredo, apaga só o que passou de 24 h)

## 5. Segurança, dados de exemplo e publicação
- [ ] 5.1 `isolamento-lancamento.test.ts`: listar, criar, excluir e restaurar com ids de outro grupo se comportam como inexistentes, inclusive percorrendo ids sequenciais, a pessoa removida do grupo é recusada sem novo login e o grupo excluído leva junto os lançamentos
- [ ] 5.2 Acrescentar ao `prisma/seed.ts` 6 meses de lançamentos dos grupos de exemplo, como no protótipo. Verificação: `npm run db:seed` popula e a lista de outubro bate com a do protótipo
- [ ] 5.3 Revisar os textos da aba Lançamentos em português do Brasil contra a spec e o protótipo
- [ ] 5.4 Publicar em produção com `CRON_SECRET`. Verificação: registrar, excluir e desfazer funcionam na URL de produção e o cron aparece no painel da Vercel

## Workflow follow-up
- Rodar `openspec validate lancamentos --strict` e arquivar a change antes de começar `resumo-mensal`.
