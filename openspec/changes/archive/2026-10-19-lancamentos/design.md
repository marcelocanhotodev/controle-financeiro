# Design: Lançamentos

## Context
Ver `proposal.md` e `openspec/project.md`. Parte de `usuarios-e-grupos`: toda ação desta change começa por `getGrupoAtual()` (grupo ativo conferido no banco) ou `exigirAdmin()`, segue o padrão de Server Actions de `src/lib/actions/` e tem o próprio teste de isolamento, como `src/lib/isolamento-clinica.test.ts` do matilha-app.

## Goals / Non-Goals
Goals:
- Totais sempre exatos
- Desfazer que não depende do aviso continuar aberto

Non-Goals:
- Edição de lançamento
- Lixeira visível. Excluído há mais de 1 minuto não volta mais

## Decisions

### Decision: Dinheiro em `Decimal(10, 2)`
Escolhido: `valor Decimal @db.Decimal(10, 2)`, sempre positivo (`CHECK (valor > 0)` em migração SQL manual), com o sinal vindo de `tipo`. É o mesmo tipo de preço e subtotal do matilha-app.
- Somas no Postgres (`SUM`, que devolve `numeric` exato) ou com `Prisma.Decimal`. Nunca com `number`.
- Entre Server Component e Client Component, o valor passa como string, porque `Decimal` não é serializável.
- `src/lib/format/moeda.ts`: `formatarReais()` com `toLocaleString("pt-BR", { style: "currency", currency: "BRL" })` e `lerValor()` aceitando "1.250,50", "1250,50" e "1250.50".
- Limite por lançamento: R$ 99.999.999,99.
Alternativa descartada: inteiro em centavos. Também é exato, mas diverge do matilha-app e obriga a dividir por 100 em todo lugar.

### Decision: Data como `@db.Date` em America/Sao_Paulo
Escolhido: `data DateTime @db.Date`, sem horário. O "hoje" padrão do formulário e os limites de mês usam `src/lib/timezone.ts`, copiado do matilha-app.

### Decision: Categorias fixas no código
Escolhido: listas constantes por tipo em `src/lib/categorias.ts`, validadas pelo Zod. A coluna `categoria` é texto.
Alternativa descartada: tabela de referência com seed, como no matilha-app depois de `converter-enums-tabelas-referencia`. Só vale a pena quando as categorias forem editáveis.

### Decision: Mês e filtros na URL
Escolhido: `/lancamentos?mes=2026-10&tipo=SAIDA&autor=3`. A página (Server Component) lê os parâmetros e consulta o banco. Os filtros trocam a URL com `router.replace`, sem recarregar a página. Depois de criar um lançamento, a interface navega para o mês dele sem filtros.
- Troca de grupo pelo seletor do topo: o `SeletorGrupo` (de `usuarios-e-grupos`) passa a fazer `router.replace(pathname)`, sem a query, em vez de só `router.refresh()`.
- Grupo trocado pelo sistema (fallback de `getGrupoAtual()` depois de uma remoção) não passa pelo seletor. Por isso a página também confere o `autor` da URL no servidor: só vale se for membro atual do grupo ativo ou autor de algum lançamento dele. Fora disso, é ignorado e o filtro fica em "Todos". `tipo` e `mes` inválidos também caem no padrão.
Por quê: deixa o mês pronto para ser compartilhado com o Resumo em `resumo-mensal`, sem estado global no cliente.
Meses do seletor: `SELECT DISTINCT date_trunc('month', data)` do grupo, mais o mês atual.

### Decision: Exclusão reversível com `excluidoEm`
Escolhido: `excluirLancamento` grava `excluidoEm`. `restaurarLancamento` limpa o campo, mas só até 60 segundos depois da exclusão (o aviso mostra 6 s, e a folga cobre a rede lenta). A rota `src/app/api/cron/limpar-lancamentos/route.ts`, protegida por `Authorization: Bearer CRON_SECRET` como `/api/cron/lembretes-whatsapp` do matilha-app e agendada uma vez por dia em `vercel.json`, apaga de vez o que foi excluído há mais de 24 horas.
- Enquanto `CRON_SECRET` não existir no ambiente, a rota recusa toda chamada com 401: segura por padrão, sem segredo vazio que aceite qualquer um.
- A configuração de `CRON_SECRET` (obrigatória em produção em `src/lib/env.ts`, `.env.example`, `docs/deploy-producao.md`, `env` do servidor dos testes em `playwright.config.ts` e cadastro na Vercel) só entra quando o ambiente de produção for configurado, na tarefa de publicação.
Permissão: autor ou Administrador, conferida na própria action com `where: { id, grupoId }`.

### Decision: Server Actions

| Server Action | Arquivo | Quem pode |
|---|---|---|
| `criarLancamento` | `actions/lancamento.ts` | membro |
| `excluirLancamento`, `restaurarLancamento` | `actions/lancamento.ts` | autor ou Administrador |

O schema Zod de criação não tem `id`, `autorId` nem `grupoId`: o autor vem da sessão e o grupo vem de `getGrupoAtual()`.

### Decision: Ex-membros na lista e no filtro
Escolhido: os lançamentos de quem saiu do grupo continuam na lista. A leitura traz o autor com um `LEFT JOIN` em `participacoes` do grupo; sem participação, o autor é ex-membro.
- Na linha: o nome seguido de "(ex-membro)", como "Contas · Pedro (ex-membro)", e a linha com opacidade de 70%. O texto "(ex-membro)" garante que a opacidade não seja o único sinal.
- Exceção aceita de contraste: com 70%, o texto cinza da linha fica em cerca de 3,1:1 no tema claro, abaixo dos 4,5:1 do WCAG AA (90% seria o mínimo para passar, mas quase não se nota). A escolha foi manter a atenuação visível. A linha leva `data-ex-membro`, e o teste de acessibilidade (axe) desliga só a regra de contraste nessas linhas; o resto da página continua passando em todas as regras.
- No filtro "Pessoa": um único filtro com os membros atuais e os ex-membros que têm lançamentos no mês exibido, em ordem alfabética, com "(ex-membro)" ao lado de quem saiu. Não há filtro separado para ativos e inativos.
- O Administrador continua podendo excluir lançamentos de ex-membros; o próprio ex-membro não tem mais acesso ao grupo.
`autorId` usa `onDelete: Restrict`, e exclusão de conta está fora do escopo.
Alternativa descartada: mostrar só "Ex-membro" no lugar do nome. Não combinava com filtrar por pessoa, porque a pessoa escolhida no filtro não apareceria em nenhuma linha.

## Data Model
```prisma
enum TipoLancamento { ENTRADA SAIDA }

model Lancamento {
  id         Int            @id @default(autoincrement())
  grupoId    Int
  autorId    Int
  tipo       TipoLancamento
  descricao  String
  valor      Decimal        @db.Decimal(10, 2)
  categoria  String
  data       DateTime       @db.Date
  criadoEm   DateTime       @default(now())
  excluidoEm DateTime?
  grupo      Grupo   @relation(fields: [grupoId], references: [id], onDelete: Cascade)
  autor      Usuario @relation(fields: [autorId], references: [id], onDelete: Restrict)
  @@index([grupoId, data(sort: Desc)])
  @@map("lancamentos")
}
```
Mais as relações inversas `lancamentos Lancamento[]` em `Usuario` e `Grupo`. O `onDelete: Cascade` em `grupo` cobre o requisito de grupo excluído.

## File Changes
```
src/app/(dashboard)/lancamentos/        página, formulário, lista, filtros, rodapé
src/app/(dashboard)/seletor-grupo.tsx    troca de grupo sem a query
src/app/api/cron/limpar-lancamentos/route.ts (+ route.test.ts)
src/lib/actions/lancamento.ts  validators/lancamento.ts  categorias.ts  lancamentos.ts (leituras)
src/lib/format/moeda.ts  timezone.ts
src/lib/isolamento-lancamento.test.ts
prisma/migrations/<data>_lancamentos/
prisma/seed.ts                           + 6 meses de lançamentos
vercel.json                              + cron diário
```

## Risks / Trade-offs
- [Erro de arredondamento ao somar no JavaScript] → somas só no Postgres ou em `Prisma.Decimal`, mais o teste de dez lançamentos de R$ 0,10.
- [Lançamento excluído por engano depois de 1 minuto] → aceito. O aviso com "Desfazer" é o único caminho de volta, como no protótipo.
- [Linhas de ex-membro abaixo do contraste mínimo (cerca de 3,1:1 no tema claro)] → aceito por decisão de produto. O texto "(ex-membro)" e o restante da linha continuam legíveis para leitor de tela, e só a regra de contraste fica de fora do teste nessas linhas.
- [Falha do cron deixa linhas excluídas no banco] → não aparecem em lugar nenhum, porque toda leitura filtra `excluidoEm IS NULL`. A próxima execução limpa.

## Migration Plan
Migração aditiva com a tabela `lancamentos` e o `CHECK`. `CRON_SECRET` entra na configuração do ambiente de produção; até lá, a limpeza automática não roda e as linhas excluídas continuam fora de todas as leituras. Rollback: reverter o deploy.
