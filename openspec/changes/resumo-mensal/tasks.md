# Tasks

Referência de código: `C:\Projeto\matilha-app` (`src/lib/painel-analitico.ts` e `src/app/(dashboard)/dashboard/`). Referência de interface: `openspec/prototype/Caixa Comum.html`, aba Resumo.

## 1. Cálculos (`resumo`)
- [ ] 1.1 Criar `src/lib/resumo.ts` com entradas, saídas e saldo do mês. Verificação: teste com valores decimais conhecidos e com lançamentos excluídos ignorados
- [ ] 1.2 Comparação das saídas com o mês anterior. Verificação: testes para "maiores", "menores", mês anterior sem saídas e variação que arredonda para zero
- [ ] 1.3 Série de seis meses com `$queryRaw`, `date_trunc` e `generate_series`. Verificação: teste com meses sem lançamento preenchidos com zero
- [ ] 1.4 Saídas por categoria, ordenadas, com percentual. Verificação: teste com o exemplo da spec (Moradia, Mercado, Lazer)
- [ ] 1.5 Totais por pessoa para todos os membros atuais. Verificação: teste com um membro sem lançamentos aparecendo com zero
- [ ] 1.6 Acrescentar a `isolamento-lancamento.test.ts` (ou criar `isolamento-resumo.test.ts`) a verificação de que nenhuma função do resumo soma lançamentos de outro grupo

## 2. Tela
- [ ] 2.1 Página `(dashboard)/resumo` com cartões de saldo, entradas e saídas (saldo negativo com sinal e destaque) e a frase de comparação. Verificação: teste Playwright com o seed
- [ ] 2.2 Instalar `recharts` e criar o gráfico de seis meses com escala a partir de zero, legenda, destaque do mês e tooltip com valor exato. Verificação: teste Playwright confere a legenda e o tooltip de uma barra
- [ ] 2.3 Seções de saídas por categoria (barra proporcional à maior) e "Quem registrou". Verificação: teste Playwright confere a ordem das categorias e a linha de quem tem R$ 0,00
- [ ] 2.4 Estado vazio: R$ 0,00 nos totais, gráfico sem barras e convite para registrar o primeiro lançamento. Verificação: teste Playwright com um grupo novo
- [ ] 2.5 Seletor de mês no Resumo e o parâmetro `mes` levado entre as abas. Verificação: teste Playwright escolhendo setembro no Resumo e abrindo Lançamentos, e o caminho inverso
- [ ] 2.6 Revisar os textos do Resumo em português do Brasil contra a spec e o protótipo

## 3. Integração do MVP
- [ ] 3.1 Teste Playwright do fluxo completo: cadastrar, criar grupo, convidar e aceitar, lançar entrada e saída, filtrar, excluir e desfazer, ver o resumo, trocar de grupo e sair do grupo
- [ ] 3.2 Conferência cruzada: com os dados do seed, os totais do Resumo de outubro batem com os do protótipo
- [ ] 3.3 Publicar em produção. Verificação: o Resumo abre com dados reais na URL de produção, no celular e no desktop

## Workflow follow-up
- Rodar `openspec validate resumo-mensal --strict` e arquivar a change.
