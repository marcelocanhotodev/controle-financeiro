## Purpose
Resumo mensal do caixa do grupo: saldo, comparação com o mês anterior, histórico de seis meses, categorias e participação de cada pessoa.

## ADDED Requirements

### Requirement: Mês do Resumo compartilhado com Lançamentos
O sistema SHALL oferecer no Resumo o mesmo seletor de mês da aba Lançamentos e SHALL manter o mês escolhido ao passar de uma aba para a outra.

#### Scenario: Do Resumo para Lançamentos
- GIVEN a pessoa escolheu "Setembro de 2026" no Resumo
- WHEN ela abre a aba Lançamentos
- THEN a lista mostra setembro de 2026

#### Scenario: De Lançamentos para o Resumo
- GIVEN a pessoa está vendo agosto de 2026 em Lançamentos
- WHEN ela abre a aba Resumo
- THEN o Resumo mostra agosto de 2026

### Requirement: Saldo, entradas e saídas do mês
O sistema SHALL mostrar o saldo do mês e os totais de entradas e saídas do grupo ativo.

#### Scenario: Cálculo
- GIVEN no mês entradas de R$ 12.000,00 e saídas de R$ 5.000,00
- WHEN o Resumo é exibido
- THEN o saldo é R$ 7.000,00
- AND entradas aparecem com "+" e saídas com "−"

#### Scenario: Saldo negativo
- GIVEN no mês saídas maiores que as entradas
- WHEN o Resumo é exibido
- THEN o saldo aparece em destaque de alerta
- AND traz o sinal de menos, para não depender só da cor

### Requirement: Comparação com o mês anterior
O sistema SHALL informar quanto as saídas do mês variaram em relação ao mês anterior, quando os dois meses têm saídas e a variação não é zero.

#### Scenario: Saídas maiores
- GIVEN saídas de R$ 5.500,00 no mês e R$ 5.000,00 no anterior
- WHEN o Resumo é exibido
- THEN aparece "Saídas 10% maiores que em setembro."

#### Scenario: Saídas menores
- GIVEN saídas menores que as do mês anterior
- WHEN o Resumo é exibido
- THEN o texto usa "menores"

#### Scenario: Sem base de comparação
- GIVEN o mês anterior não tem saídas ou a variação arredonda para zero
- WHEN o Resumo é exibido
- THEN nenhuma comparação é mostrada

### Requirement: Gráfico dos últimos seis meses
O sistema SHALL exibir um gráfico de barras de entradas e saídas dos seis meses que terminam no mês selecionado.

#### Scenario: Seis meses
- GIVEN o mês selecionado é outubro de 2026
- WHEN o gráfico é exibido
- THEN mostra de maio a outubro de 2026, com uma barra de entradas e uma de saídas por mês

#### Scenario: Mês selecionado em destaque
- GIVEN o gráfico exibido
- WHEN a pessoa olha as barras
- THEN as barras do mês selecionado têm destaque e as demais ficam atenuadas

#### Scenario: Escala honesta
- GIVEN o gráfico exibido
- WHEN os valores são desenhados
- THEN a escala começa em zero
- AND todos os rótulos do eixo vertical correspondem a valores alcançados pela escala
- AND há legenda para Entradas e Saídas

#### Scenario: Valor de cada barra
- GIVEN o gráfico exibido
- WHEN a pessoa passa o cursor ou toca numa barra
- THEN vê o mês, o tipo e o valor exato em reais

### Requirement: Saídas por categoria
O sistema SHALL listar as saídas do mês agrupadas por categoria, da maior para a menor, com valor, percentual do total e barra proporcional.

#### Scenario: Ordem e proporção
- GIVEN saídas de Moradia R$ 2.370,00, Mercado R$ 1.600,00 e Lazer R$ 400,00
- WHEN a seção é exibida
- THEN a ordem é Moradia, Mercado, Lazer
- AND a barra de Moradia ocupa a largura toda e as outras são proporcionais a ela
- AND os percentuais somam 100% (com arredondamento)

#### Scenario: Sem saídas
- GIVEN o mês não tem saídas
- WHEN a seção é exibida
- THEN aparece "Nenhuma saída registrada neste mês."

### Requirement: Totais por pessoa
O sistema SHALL mostrar, para cada membro atual do grupo, o total de entradas e de saídas que ele registrou no mês.

#### Scenario: Tabela por pessoa
- GIVEN um grupo com Marcelo, Ana e Pedro
- WHEN a seção "Quem registrou" é exibida
- THEN há uma linha por pessoa com entradas e saídas do mês
- AND quem não lançou nada aparece com R$ 0,00

### Requirement: Estado vazio do grupo
O sistema SHALL exibir um resumo coerente quando o grupo ainda não tem lançamentos.

#### Scenario: Grupo novo
- GIVEN um grupo recém-criado
- WHEN o Resumo é exibido
- THEN saldo, entradas e saídas aparecem como R$ 0,00
- AND o gráfico mostra seis meses sem barras
- AND um texto convida a registrar o primeiro lançamento
