# Design: Resumo mensal

## Context
Ver `proposal.md` e `openspec/project.md`. Parte de `lancamentos` (tabela `lancamentos` com `valor Decimal(10,2)`, mês e filtros na URL, seletor de mês) e de `getGrupoAtual()` de `usuarios-e-grupos`. O modelo no matilha-app é `src/lib/painel-analitico.ts` e os gráficos em `src/app/(dashboard)/dashboard/*-chart.tsx`.

## Goals / Non-Goals
Goals:
- Mesmos totais da aba Lançamentos e do protótipo para os mesmos dados
- Gráfico honesto: escala a partir de zero e valor exato em cada barra

Non-Goals:
- Cache ou tabelas de agregados. O volume de um grupo familiar é pequeno
- Comparação de entradas com o mês anterior. O protótipo compara só as saídas

## Decisions

### Decision: Agregações no Postgres, em `src/lib/resumo.ts`
Escolhido, sempre com `grupoId` de `getGrupoAtual()` e `excluidoEm IS NULL`:
- Totais do mês: `prisma.lancamento.groupBy({ by: ["tipo"], _sum: { valor: true } })` no intervalo do mês.
- Seis meses: `$queryRaw` com `date_trunc('month', data)` e `generate_series` para os meses sem lançamento virem com zero.
- Categorias: `groupBy({ by: ["categoria"] })` só de saídas, ordenado pela soma.
- Por pessoa: participações atuais do grupo com `LEFT JOIN` nas somas do mês, para quem não lançou aparecer com R$ 0,00.
Percentuais e variação calculados com `Prisma.Decimal` e arredondados só na exibição.
Por quê: é o padrão de `painel-analitico.ts` do matilha-app, e somar no banco mantém os valores exatos.

### Decision: Comparação com o mês anterior
Escolhido: variação = (saídas do mês ÷ saídas do anterior − 1), arredondada para inteiro. Só aparece se o mês anterior tem saídas e o arredondamento não dá zero. O nome do mês anterior vem de `toLocaleString("pt-BR", { month: "long" })`.

### Decision: Gráfico com Recharts
Escolhido: Recharts, como `faturamento-por-dia-chart.tsx` do matilha-app. Barras agrupadas de entradas e saídas, `domain={[0, "auto"]}`, ticks gerados pela própria escala, legenda, barras do mês escolhido com opacidade cheia e as demais atenuadas, e tooltip com mês, tipo e valor em `formatarReais`. O gráfico fica dentro de um quadro com rolagem própria no celular. É um Client Component que recebe os valores já como string.

### Decision: Mês compartilhado pela URL
Escolhido: `/resumo?mes=2026-09` usa o mesmo seletor de mês de `lancamentos`. Os links das abas carregam o parâmetro `mes` atual, e os filtros de tipo e pessoa não passam de uma aba para a outra.
Por quê: `lancamentos` já guarda o mês na URL. Não precisa de estado global.

## File Changes
```
src/app/(dashboard)/resumo/        página, cartões de totais, comparação, gráfico, categorias, por pessoa
src/lib/resumo.ts (+ resumo.test.ts)
src/app/(dashboard)/layout.tsx     links das abas levam o parâmetro mes
e2e/fluxo-completo.spec.ts
```

## Risks / Trade-offs
- [O `$queryRaw` da série escapa do filtro automático de tipos do Prisma] → `grupoId` sempre por parâmetro (`Prisma.sql`), e o teste de isolamento cobre a série.
- [Percentuais que não somam exatamente 100%] → aceito. A spec fala em "com arredondamento".
- [Fuso horário desloca o mês] → datas são `@db.Date` e os limites de mês vêm de `timezone.ts`.

## Migration Plan
Sem migração. Deploy normal na Vercel e rollback revertendo o deploy.
