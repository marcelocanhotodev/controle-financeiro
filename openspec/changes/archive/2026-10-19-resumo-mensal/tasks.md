# Tasks

Referência de código: `C:\Projeto\matilha-app` (`src/lib/painel-analitico.ts` e `src/app/(dashboard)/dashboard/`). Referência de interface: `openspec/prototype/Caixa Comum.html`, aba Resumo.

## 1. Cálculos (`resumo`)
- [x] 1.1 Criar `src/lib/resumo.ts` com entradas, saídas e saldo do mês. Verificação: teste com valores decimais conhecidos e com lançamentos excluídos ignorados
- [x] 1.2 Comparação das saídas com o mês anterior. Verificação: testes para "maiores", "menores", mês anterior sem saídas e variação que arredonda para zero
- [x] 1.3 Série de seis meses com `$queryRaw`, `date_trunc` e `generate_series`. Verificação: teste com meses sem lançamento preenchidos com zero
- [x] 1.4 Saídas por categoria, ordenadas, com percentual. Verificação: teste com o exemplo da spec (Moradia, Mercado, Lazer)
- [x] 1.5 Totais por pessoa: todos os membros atuais e os ex-membros com lançamento no mês (`exMembro: true`). Verificação: teste com um membro sem lançamentos aparecendo com zero, um ex-membro com lançamento no mês aparecendo, um ex-membro sem lançamento no mês ausente e a soma das linhas igual aos totais do mês
- [x] 1.6 Acrescentar a `isolamento-lancamento.test.ts` (ou criar `isolamento-resumo.test.ts`) a verificação de que nenhuma função do resumo soma lançamentos de outro grupo

## 2. Tela
- [x] 2.1 Página `(dashboard)/resumo` com cartões de saldo, entradas e saídas (saldo negativo com sinal e destaque) e a frase de comparação. Verificação: teste Playwright com o seed
- [x] 2.2 Instalar `recharts` e criar o gráfico de seis meses com escala a partir de zero, legenda, destaque do mês e tooltip com valor exato. Verificação: teste Playwright confere a legenda e o tooltip de uma barra
- [x] 2.3 Seções de saídas por categoria (barra proporcional à maior) e "Quem registrou", com linhas de ex-membro com "(ex-membro)", opacidade de 70% e `data-ex-membro`. Verificação: teste Playwright confere a ordem das categorias, a linha de quem tem R$ 0,00 e a linha opaca de um ex-membro
- [x] 2.4 Estados vazios: grupo novo com R$ 0,00, gráfico sem barras e convite para registrar o primeiro lançamento; mês vazio num grupo com histórico com R$ 0,00, gráfico normal e "Nenhum lançamento em <mês de ano>.", sem o convite. Verificação: teste Playwright para os dois casos
- [x] 2.5 Seletor de mês no Resumo e o parâmetro `mes` levado pelas abas em `abas.tsx`; trocar de grupo volta ao mês atual. Verificação: teste Playwright escolhendo setembro no Resumo e abrindo Lançamentos, o caminho inverso e a troca de grupo voltando ao mês atual
- [x] 2.6 Revisar os textos do Resumo em português do Brasil contra a spec e o protótipo
- [x] 2.7 Acessibilidade do Resumo nos temas claro e escuro. Verificação: axe sem violações na página, com a regra de contraste desligada só nas linhas `data-ex-membro` (exceção aceita no design)

## 3. Integração do MVP
- [x] 3.1 Teste Playwright do fluxo completo: cadastrar, criar grupo, convidar e aceitar, lançar entrada e saída, filtrar, excluir e desfazer, ver o resumo, trocar de grupo e sair do grupo
- [x] 3.2 Conferência cruzada: com os dados do seed, os totais do Resumo de outubro batem com os do protótipo
- [ ] 3.3 Publicar em produção. Verificação: o Resumo abre com dados reais na URL de produção, no celular e no desktop

## Workflow follow-up
- Rodar `openspec validate resumo-mensal --strict` e arquivar a change.
